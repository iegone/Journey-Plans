import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "⚠️  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  {
    auth: {
      persistSession: false,
    },
  }
);

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const SESSION_COOKIE_NAME = "jp_session";
const SESSION_MAX_AGE_SECONDS =
  Number(process.env.SESSION_MAX_AGE_SECONDS) || 60 * 60 * 12;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEFAULT_NEW_USER_PASSWORD =
  process.env.DEFAULT_NEW_USER_PASSWORD && process.env.DEFAULT_NEW_USER_PASSWORD.length >= 8
    ? process.env.DEFAULT_NEW_USER_PASSWORD
    : "ChangeMe123!";

if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️  Missing JWT_SECRET env var. Using fallback secret for development only."
  );
}

if (
  process.env.DEFAULT_NEW_USER_PASSWORD &&
  process.env.DEFAULT_NEW_USER_PASSWORD.length < 8
) {
  console.warn(
    "⚠️  DEFAULT_NEW_USER_PASSWORD is shorter than 8 characters. Falling back to 'ChangeMe123!'."
  );
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    must_change_password: user.must_change_password ?? false,
    created_at: user.created_at ?? null,
    last_login: user.last_login ?? null,
  };
}

function createSessionToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      must_change_password: user.must_change_password ?? false,
    },
    JWT_SECRET,
    { expiresIn: SESSION_MAX_AGE_SECONDS }
  );
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
  });
}

function extractToken(req) {
  const headerToken = req.headers.authorization;
  if (headerToken?.startsWith("Bearer ")) {
    return headerToken.slice(7);
  }
  if (req.cookies?.[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  return null;
}

function authenticate(requiredRole) {
  return (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payload = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
        full_name: payload.full_name,
        must_change_password: payload.must_change_password ?? false,
      };

      if (requiredRole && req.user.role !== requiredRole) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (error) {
      console.error("Auth verification failed:", error);
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}

async function getSettingValue(key) {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .limit(1);

  if (error) throw error;
  return data && data.length ? data[0].value : null;
}

async function setSettingValue(key, value) {
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value }, { onConflict: "key" });

  if (error) throw error;
}

// No longer needed - journey_plan_number is now manually controlled
// async function setJourneySequence(nextValue) { ... }

function parseNextValue(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object") {
    if (typeof value.next === "number") return value.next;
    if (typeof value.value === "number") return value.value;
  }
  return null;
}

async function recomputeNextJourneyNumberSeed() {
  const { data, error } = await supabase
    .from("journey_plans")
    .select("journey_plan_number")
    .order("journey_plan_number", { ascending: false })
    .limit(1);

  if (error) throw error;

  const next = data?.length ? Number(data[0].journey_plan_number) + 1 : 1;
  await setSettingValue("next_journey_plan_number", { next });
  return next;
}

async function getNextJourneyNumber() {
  const stored = parseNextValue(
    await getSettingValue("next_journey_plan_number")
  );
  if (stored && stored > 0) {
    return stored;
  }
  return await recomputeNextJourneyNumberSeed();
}

// ===== Logging Function =====
async function logActivity(
  userName,
  action,
  journeyPlanNumber = null,
  details = {}
) {
  try {
    await supabase.from("activity_logs").insert({
      user_name: userName,
      action: action,
      journey_plan_number: journeyPlanNumber,
      details: details,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ===== Auth APIs =====
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .limit(1);

    if (error) throw error;

    if (!users || users.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // تحديث last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    const token = createSessionToken(user);
    setSessionCookie(res, token);

    // Log login
    await logActivity(user.username, "login");

    res.json({
      success: true,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", authenticate(), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "User not found" });
    }

    const publicUser = toPublicUser(data);
    const token = createSessionToken(data);
    setSessionCookie(res, token);
    req.user = publicUser;
    res.json({ user: publicUser });
  } catch (error) {
    console.error("auth/me error:", error);
    res.status(500).json({ error: "Failed to resolve user session" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.username) {
        logActivity(payload.username, "logout").catch((error) =>
          console.error("Failed to log logout activity:", error)
        );
      }
    } catch (error) {
      // Ignore invalid tokens on logout, still clear cookie
    }
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

app.post("/api/auth/change-password", authenticate(), async (req, res) => {
  try {
    const { username: bodyUsername, currentPassword, newPassword } = req.body;

    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ error: "New password is required" });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters" });
    }

    const targetUsername =
      req.user.role === "admin" && bodyUsername
        ? bodyUsername
        : req.user.username;

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", targetUsername)
      .limit(1);

    if (error) throw error;
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    const isSelfUpdate = targetUsername === req.user.username;
    const mustValidateCurrent =
      isSelfUpdate || req.user.role !== "admin" || currentPassword;

    if (mustValidateCurrent) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ error: "Current password is required" });
      }

      const isValid = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );

      if (!isValid) {
        return res
          .status(401)
          .json({ error: "Current password is incorrect" });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    const updatePayload = {
      password_hash: newHash,
      must_change_password: targetUsername === req.user.username ? false : true,
    };

    await supabase.from("users").update(updatePayload).eq("id", user.id);

    const { data: updatedUser, error: fetchUpdatedError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (fetchUpdatedError) throw fetchUpdatedError;

    await logActivity(
      req.user.username,
      "change_password",
      null,
      targetUsername === req.user.username
        ? {}
        : { target_user: targetUsername }
    );

    const sanitized = toPublicUser(updatedUser);
    const refreshedToken = createSessionToken(updatedUser);
    setSessionCookie(res, refreshedToken);

    res.json({
      success: true,
      message: "Password changed successfully",
      user: sanitized,
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

app.post("/api/users", authenticate("admin"), async (req, res) => {
  try {
    const { username, fullName, role = "user" } = req.body ?? {};

    const trimmedUsername = typeof username === "string" ? username.trim() : "";
    const trimmedFullName =
      typeof fullName === "string" ? fullName.trim() : null;
    const safeRole =
      role === "admin" || role === "user" || role === "employee"
        ? (role === "employee" ? "user" : role)
        : "user";

    if (!trimmedUsername) {
      return res.status(400).json({ error: "Username is required" });
    }
    if (trimmedUsername.length < 3) {
      return res
        .status(400)
        .json({ error: "Username must be at least 3 characters" });
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", trimmedUsername)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(DEFAULT_NEW_USER_PASSWORD, 10);

    const { data, error } = await supabase
      .from("users")
      .insert({
        username: trimmedUsername,
        password_hash: passwordHash,
        full_name: trimmedFullName,
        role: safeRole,
        must_change_password: true,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(req.user.username, "create_user", null, {
      created_user: trimmedUsername,
      role: safeRole,
    });

    res.status(201).json({
      user: toPublicUser(data),
      defaultPassword: DEFAULT_NEW_USER_PASSWORD,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.get("/api/users/default-password", authenticate("admin"), (_req, res) => {
  res.json({ defaultPassword: DEFAULT_NEW_USER_PASSWORD });
});

app.get("/api/users", authenticate("admin"), async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ users: (data || []).map((u) => toPublicUser(u)) });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post(
  "/api/users/:id/reset-password",
  authenticate("admin"),
  async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    try {
      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError) throw fetchError;
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const passwordHash = await bcrypt.hash(DEFAULT_NEW_USER_PASSWORD, 10);

      const { data: updated, error: updateError } = await supabase
        .from("users")
        .update({
          password_hash: passwordHash,
          must_change_password: true,
        })
        .eq("id", userId)
        .select()
        .single();

      if (updateError) throw updateError;

      await logActivity(req.user.username, "reset_password", null, {
        target_user: user.username,
      });

      res.json({
        user: toPublicUser(updated),
        defaultPassword: DEFAULT_NEW_USER_PASSWORD,
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
);

// ===== Logs APIs =====
app.get("/api/logs", authenticate("admin"), async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

app.get("/api/journey-plans", authenticate(), async (req, res) => {
  try {
    const { limit } = req.query;
    const query = supabase
      .from("journey_plans")
      .select("*")
      .order("journey_plan_number", { ascending: false });

    if (limit) {
      query.limit(Number(limit));
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data });
  } catch (error) {
    console.error("Error fetching journey plans", error);
    res.status(500).json({ error: "Failed to fetch journey plans" });
  }
});

app.get(
  "/api/journey-plans/next-number",
  authenticate(),
  async (_req, res) => {
    try {
      const nextNumber = await getNextJourneyNumber();
      res.json({ nextNumber });
    } catch (error) {
      console.error("Error fetching next journey plan number", error);
      res
        .status(500)
        .json({ error: "Failed to determine next journey plan number" });
    }
  }
);

app.post("/api/journey-plans", authenticate(), async (req, res) => {
  try {
    const payload = req.body;
    const userName = req.user?.username || "Unknown";

    // الحصول على رقم Journey Plan التالي
    const nextNumber = await getNextJourneyNumber();

    const insertData = {
      journey_plan_number: nextNumber,
      departure_date: payload.departure_date ?? null,
      vehicle_number: payload.vehicle_number ?? null,
      driver_name: payload.driver_name ?? null,
      from_location: payload.from_location ?? null,
      from_departure_time: payload.from_departure_time ?? null,
      to_location: payload.to_location ?? null,
      to_arrival_time: payload.to_arrival_time ?? null,
      call_journey_manager: payload.call_journey_manager ?? null,
      signature_date: payload.signature_date ?? null,
      journey_plan_number_hint: payload.journey_plan_number_hint ?? null,
      passengers: payload.passengers ?? [],
      rest_stops: payload.rest_stops ?? [],
      route_snapshot: payload.route_snapshot ?? {},
      notes: payload.notes ?? null,
    };

    const { data, error } = await supabase
      .from("journey_plans")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    // تحديث الرقم التالي
    await setSettingValue("next_journey_plan_number", { next: nextNumber + 1 });

    // Log activity
    await logActivity(userName, "create", nextNumber, {
      driver: payload.driver_name,
      vehicle: payload.vehicle_number,
      from: payload.from_location,
      to: payload.to_location,
    });

    res.status(201).json({ data });
  } catch (error) {
    console.error("Error saving journey plan", error);
    res.status(500).json({ error: "Failed to save journey plan" });
  }
});

app.put("/api/journey-plans/:number", authenticate(), async (req, res) => {
  const currentNumber = Number(req.params.number);
  if (!Number.isFinite(currentNumber)) {
    return res.status(400).json({ error: "Invalid journey plan number" });
  }

  try {
    const payload = req.body ?? {};

    const updateData = {};
    const allowedFields = [
      "journey_plan_number",
      "departure_date",
      "vehicle_number",
      "driver_name",
      "from_location",
      "from_departure_time",
      "to_location",
      "to_arrival_time",
      "call_journey_manager",
      "signature_date",
      "journey_plan_number_hint",
      "passengers",
      "rest_stops",
      "route_snapshot",
      "notes",
    ];

    allowedFields.forEach((field) => {
      if (field in payload) {
        updateData[field] = payload[field];
      }
    });

    if ("journey_plan_number" in updateData) {
      const newNumber = Number(updateData.journey_plan_number);
      if (!Number.isInteger(newNumber) || newNumber < 1) {
        return res
          .status(400)
          .json({ error: "journey_plan_number must be a positive integer" });
      }
      updateData.journey_plan_number = newNumber;
    }

    if ("passengers" in updateData && !Array.isArray(updateData.passengers)) {
      delete updateData.passengers;
    }

    if ("rest_stops" in updateData && !Array.isArray(updateData.rest_stops)) {
      delete updateData.rest_stops;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields provided for update" });
    }

    const { data, error } = await supabase
      .from("journey_plans")
      .update(updateData)
      .eq("journey_plan_number", currentNumber)
      .select()
      .single();

    if (error) throw error;

    await recomputeNextJourneyNumberSeed();

    // Log activity
    const userName = req.user?.username || "Unknown";
    await logActivity(userName, "update", currentNumber, {
      updated_fields: Object.keys(updateData),
    });

    res.json({ data });
  } catch (error) {
    console.error("Error updating journey plan", error);
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "Journey plan number already exists" });
    }
    res.status(500).json({ error: "Failed to update journey plan" });
  }
});

app.delete(
  "/api/journey-plans/:number",
  authenticate("admin"),
  async (req, res) => {
    const number = Number(req.params.number);
    if (!Number.isFinite(number)) {
      return res.status(400).json({ error: "Invalid journey plan number" });
    }

    try {
      const { data, error } = await supabase
        .from("journey_plans")
        .delete()
        .eq("journey_plan_number", number)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({ error: "Journey plan not found" });
      }

      // Log activity
      const userName = req.user?.username || "Unknown";
      await logActivity(userName, "delete", number, {
        driver: data.driver_name,
        vehicle: data.vehicle_number,
      });

      res.json({ message: "Journey plan deleted successfully", data });
    } catch (error) {
      console.error("Error deleting journey plan:", error);
      res.status(500).json({ error: "Failed to delete journey plan" });
    }
  }
);

// ===== Options APIs =====
app.get("/api/options/drivers", authenticate(), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

app.post("/api/options/drivers", authenticate(), async (req, res) => {
  try {
    const { name, code, gsm } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Driver name is required" });
    }

    const { data, error } = await supabase
      .from("drivers")
      .insert({ name: name.trim(), code, gsm })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Driver already exists" });
      }
      throw error;
    }

    res.status(201).json({ data });
  } catch (error) {
    console.error("Error adding driver:", error);
    res.status(500).json({ error: "Failed to add driver" });
  }
});

app.get("/api/options/vehicles", authenticate(), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("number", { ascending: true });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

app.post("/api/options/vehicles", authenticate(), async (req, res) => {
  try {
    const { number } = req.body;
    if (!number || !number.trim()) {
      return res.status(400).json({ error: "Vehicle number is required" });
    }

    const { data, error } = await supabase
      .from("vehicles")
      .insert({ number: number.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Vehicle already exists" });
      }
      throw error;
    }

    res.status(201).json({ data });
  } catch (error) {
    console.error("Error adding vehicle:", error);
    res.status(500).json({ error: "Failed to add vehicle" });
  }
});

app.get("/api/options/locations", authenticate(), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

app.post("/api/options/locations", authenticate(), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Location name is required" });
    }

    const { data, error } = await supabase
      .from("locations")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Location already exists" });
      }
      throw error;
    }

    res.status(201).json({ data });
  } catch (error) {
    console.error("Error adding location:", error);
    res.status(500).json({ error: "Failed to add location" });
  }
});

app.get("/api/options/rest-types", authenticate(), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("rest_types")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error("Error fetching rest types:", error);
    res.status(500).json({ error: "Failed to fetch rest types" });
  }
});

app.post("/api/options/rest-types", authenticate(), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Rest type name is required" });
    }

    const { data, error } = await supabase
      .from("rest_types")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Rest type already exists" });
      }
      throw error;
    }

    res.status(201).json({ data });
  } catch (error) {
    console.error("Error adding rest type:", error);
    res.status(500).json({ error: "Failed to add rest type" });
  }
});

app.put("/api/settings/next-number", authenticate("admin"), async (req, res) => {
  try {
    const { nextNumber } = req.body ?? {};
    const parsed = Number(nextNumber);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return res
        .status(400)
        .json({ error: "nextNumber must be a positive integer" });
    }

    // حفظ الرقم التالي في settings فقط (بدون sequence)
    await setSettingValue("next_journey_plan_number", { next: parsed });
    res.json({ nextNumber: parsed });
  } catch (error) {
    console.error("Error updating next journey number setting", error);
    res.status(500).json({ error: "Failed to update next journey number" });
  }
});

const host = "0.0.0.0";
app.listen(PORT, host, () => {
  console.log(
    `Journey Plan server ready.
    Use http://localhost:${PORT} 
    http://192.168.100.6:${PORT} `
  );
});
