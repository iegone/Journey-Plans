import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  {
    auth: {
      persistSession: false
    }
  }
);

async function getSettingValue(key) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .limit(1);

  if (error) throw error;
  return data && data.length ? data[0].value : null;
}

async function setSettingValue(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' });

  if (error) throw error;
}

function parseNextValue(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    if (typeof value.next === 'number') return value.next;
    if (typeof value.value === 'number') return value.value;
  }
  return null;
}

async function recomputeNextJourneyNumberSeed() {
  const { data, error } = await supabase
    .from('journey_plans')
    .select('journey_plan_number')
    .order('journey_plan_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  const next = data?.length ? Number(data[0].journey_plan_number) + 1 : 1;
  await setSettingValue('next_journey_plan_number', { next });
  return next;
}

async function ensureNextJourneyNumberSeed(latestNumber) {
  if (!Number.isFinite(latestNumber)) return;
  const candidate = Number(latestNumber) + 1;
  let stored = parseNextValue(await getSettingValue('next_journey_plan_number'));
  if (!stored || candidate > stored) {
    await setSettingValue('next_journey_plan_number', { next: candidate });
  }
}

async function getNextJourneyNumber() {
  const stored = parseNextValue(await getSettingValue('next_journey_plan_number'));
  if (stored && stored > 0) {
    return stored;
  }
  return await recomputeNextJourneyNumberSeed();
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/journey-plans', async (req, res) => {
  try {
    const { limit } = req.query;
    const query = supabase
      .from('journey_plans')
      .select('*')
      .order('journey_plan_number', { ascending: false });

    if (limit) {
      query.limit(Number(limit));
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data });
  } catch (error) {
    console.error('Error fetching journey plans', error);
    res.status(500).json({ error: 'Failed to fetch journey plans' });
  }
});

app.get('/api/journey-plans/next-number', async (_req, res) => {
  try {
    const nextNumber = await getNextJourneyNumber();
    res.json({ nextNumber });
  } catch (error) {
    console.error('Error fetching next journey plan number', error);
    res.status(500).json({ error: 'Failed to determine next journey plan number' });
  }
});

app.post('/api/journey-plans', async (req, res) => {
  try {
    const payload = req.body;

    const insertData = {
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
      notes: payload.notes ?? null
    };

    const { data, error } = await supabase
      .from('journey_plans')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    await ensureNextJourneyNumberSeed(Number(data.journey_plan_number));

    res.status(201).json({ data });
  } catch (error) {
    console.error('Error saving journey plan', error);
    res.status(500).json({ error: 'Failed to save journey plan' });
  }
});

app.put('/api/journey-plans/:number', async (req, res) => {
  const currentNumber = Number(req.params.number);
  if (!Number.isFinite(currentNumber)) {
    return res.status(400).json({ error: 'Invalid journey plan number' });
  }

  try {
    const payload = req.body ?? {};

    const updateData = {};
    const allowedFields = [
      'journey_plan_number',
      'departure_date',
      'vehicle_number',
      'driver_name',
      'from_location',
      'from_departure_time',
      'to_location',
      'to_arrival_time',
      'call_journey_manager',
      'signature_date',
      'journey_plan_number_hint',
      'passengers',
      'rest_stops',
      'route_snapshot',
      'notes'
    ];

    allowedFields.forEach(field => {
      if (field in payload) {
        updateData[field] = payload[field];
      }
    });

    if ('journey_plan_number' in updateData) {
      const newNumber = Number(updateData.journey_plan_number);
      if (!Number.isInteger(newNumber) || newNumber < 1) {
        return res.status(400).json({ error: 'journey_plan_number must be a positive integer' });
      }
      updateData.journey_plan_number = newNumber;
    }

    if ('passengers' in updateData && !Array.isArray(updateData.passengers)) {
      delete updateData.passengers;
    }

    if ('rest_stops' in updateData && !Array.isArray(updateData.rest_stops)) {
      delete updateData.rest_stops;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    const { data, error } = await supabase
      .from('journey_plans')
      .update(updateData)
      .eq('journey_plan_number', currentNumber)
      .select()
      .single();

    if (error) throw error;

    await recomputeNextJourneyNumberSeed();

    res.json({ data });
  } catch (error) {
    console.error('Error updating journey plan', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Journey plan number already exists' });
    }
    res.status(500).json({ error: 'Failed to update journey plan' });
  }
});

app.put('/api/settings/next-number', async (req, res) => {
  try {
    const { nextNumber } = req.body ?? {};
    const parsed = Number(nextNumber);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return res.status(400).json({ error: 'nextNumber must be a positive integer' });
    }

    await setSettingValue('next_journey_plan_number', { next: parsed });
    res.json({ nextNumber: parsed });
  } catch (error) {
    console.error('Error updating next journey number setting', error);
    res.status(500).json({ error: 'Failed to update next journey number' });
  }
});

app.listen(PORT, () => {
  console.log(`🚐 Journey Plan server running at http://localhost:${PORT}`);
});
