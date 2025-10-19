-- تحديث كلمة مرور الموظف
-- Employee: employee / employee123

UPDATE public.users 
SET password_hash = '$2a$10$hwIptozj1IZ4fFoW6Jjm6e3L1Zz.RtaXEGK8axITVDXE3qD/UcBUm',
    must_change_password = false
WHERE username = 'employee';

-- التحقق من النتيجة
SELECT username, full_name, role FROM public.users;

