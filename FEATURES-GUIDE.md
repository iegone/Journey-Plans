# 🎉 New Features Guide

## ✨ المميزات الجديدة

---

## 1️⃣ في `index.html` (الصفحة الرئيسية)

### 📂 Load Saved Journey

- **Dropdown** بكل الـ Journeys المحفوظة
- **خانة بحث** - ابحث بأي من:
  - رقم Journey Plan
  - اسم السائق
  - رقم المركبة
  - From/To locations

### ✏️ Edit Journey

- حمّل أي Journey قديم
- عدّل البيانات
- اضغط **"Update Journey Plan"** (زر برتقالي)
- ✅ التعديلات تُحفظ

### ➕ New Journey

- بعد تحميل Journey، تقدر تضغط **"New Journey Plan"** (زر أخضر)
- الحقول تتمسح
- رقم جديد يظهر
- جاهز لإدخال بيانات جديدة

### ✔️ Validation

**الحقول الإجبارية** (لازم تتملى قبل الحفظ):

- ✅ Driver name
- ✅ Vehicle number
- ✅ Departure date
- ✅ From: location + time
- ✅ To: location + time

❌ **لو حقل ناقص** → رسالة تظهر بالحقول المطلوبة

---

## 2️⃣ في `dashboard.html`

### 🔍 Filters

- **Search box** - ابحث في كل البيانات
- **Date filter** - فلتر حسب تاريخ المغادرة
- **Clear Filters** - مسح الفلاتر

### 🎬 Actions لكل Journey:

| زر         | اللون   | الوظيفة                                 |
| ---------- | ------- | --------------------------------------- |
| **View**   | أخضر    | فتح Journey في index.html للعرض/التعديل |
| **Edit #** | برتقالي | تعديل رقم Journey Plan                  |
| **Delete** | أحمر    | حذف Journey (مع تأكيد)                  |

---

## 3️⃣ التحكم في رقم Journey Plan

### في Dashboard:

1. اضغط **"Set Next Number"**
2. اكتب الرقم المطلوب (مثلاً: 100)
3. ✅ الرقم يتغير **ويبقى ثابت**

### التسلسل التلقائي:

- Journey جديد → الرقم يزيد تلقائياً
- مثال: 100 → 101 → 102 → 103

---

## 🚀 سير العمل

### إنشاء Journey جديد:

1. افتح `index.html`
2. املأ البيانات
3. اضغط **"Save Journey Plan"**
4. ✅ يُحفظ ويفتح template للطباعة

### تعديل Journey موجود:

1. افتح `index.html`
2. ابحث واختر Journey من الـ dropdown
3. اضغط **"Load Selected Journey"**
4. عدّل البيانات
5. اضغط **"Update Journey Plan"**
6. ✅ التعديلات تُحفظ

### من Dashboard:

1. افتح `dashboard.html`
2. ابحث/فلتر حسب الحاجة
3. اضغط **"View"** لفتح Journey
4. أو اضغط **"Delete"** للحذف

---

## ⚠️ ملاحظات

1. **Migration**: لازم تشغل migration script أولاً (راجع `MIGRATION-GUIDE.md`)
2. **Pop-ups**: السماح بالـ pop-ups للطباعة من template
3. **Validation**: الحقول الإجبارية لازم تتملى

