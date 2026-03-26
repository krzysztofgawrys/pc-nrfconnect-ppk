/*
 * Override react-redux's useDispatch to return a thunk-aware dispatch type,
 * so all existing components can call dispatch(thunkAction()) without casts.
 */
import type { AppDispatch } from '../store/store';

declare module 'react-redux' {
    // Default to AppDispatch so dispatch(thunk()) works; keep generic for
    // explicit useDispatch<AppDispatch>() calls.
    export function useDispatch<TDispatch = AppDispatch>(): TDispatch;
}
