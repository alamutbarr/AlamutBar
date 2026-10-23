import { Navigate } from 'react-router-dom';

// ثبت‌نام و ورود در یک فرآیند واحد با کد پیامکی ادغام شده‌اند (صفحه Login)
export default function Register() {
  return <Navigate to="/owner/login" replace />;
}
