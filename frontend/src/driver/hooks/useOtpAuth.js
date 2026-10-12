import { useState, useCallback, useRef } from 'react';

const SIMULATED_CODE = '1234';

export function useOtpAuth() {
  const [state, setState] = useState({
    step: 'idle',
    mobile: '',
    code: '',
    error: '',
  });
  const timerRef = useRef(null);

  const requestOtp = useCallback((mobile) => {
    if (!/^09\d{9}$/.test(mobile)) {
      setState((s) => ({ ...s, error: 'شماره موبایل نامعتبر است' }));
      return false;
    }
    setState((s) => ({ ...s, mobile, step: 'sent', error: '' }));
    return true;
  }, []);

  const verifyOtp = useCallback((code) => {
    return new Promise((resolve) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (code === SIMULATED_CODE) {
          setState((s) => ({ ...s, step: 'verified', error: '' }));
          resolve(true);
        } else {
          setState((s) => ({ ...s, error: 'کد اشتباه است' }));
          resolve(false);
        }
      }, 400);
    });
  }, []);

  const reset = useCallback(() => {
    setState({ step: 'idle', mobile: '', code: '', error: '' });
  }, []);

  const setCode = useCallback((code) => {
    setState((s) => ({ ...s, code, error: '' }));
  }, []);

  return { state, requestOtp, verifyOtp, reset, setCode };
}