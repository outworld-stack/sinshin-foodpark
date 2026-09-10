// src/hooks/site/useCheckoutPage.ts
import { useReducer, useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCartStore } from '#/stores/cartStore'
import { useAuthStore } from '#/stores/authStore'
import { useToastStore } from '#/stores/toastStore'
import { checkoutDetailsOptions } from '#/utils/queryOptions'
import { qk } from '#/utils/queryKeys'
import { processCheckout } from '#/server/checkout'
import type { CheckoutCalculation, CheckoutSubmitPayload, CouponStatus, DeliveryType, InvoiceData } from '#/types/site/checkout'

// --- ثابت‌های نمایشی (سرور مرجع محاسبه‌ی نهاییه) ---
const VALID_COUPON = 'SINSHIN20'
const COUPON_PERCENT = 20

// --- State ---
interface CheckoutState {
  deliveryType: DeliveryType
  selectedAddressId: string | null
  isAddressModalOpen: boolean
  couponStatus: CouponStatus
  couponCode: string
  couponApplied: boolean
  useWallet: boolean
  selectedGateway: string
  customerNote: string
  invoice: InvoiceData | null
}

type CheckoutAction =
  | { type: 'SET_DELIVERY_TYPE'; payload: DeliveryType }
  | { type: 'SELECT_ADDRESS'; payload: string }
  | { type: 'OPEN_ADDRESS_MODAL' }
  | { type: 'CLOSE_ADDRESS_MODAL' }
  | { type: 'SET_COUPON_STATUS'; payload: CouponStatus }
  | { type: 'SET_COUPON_CODE'; payload: string }
  | { type: 'APPLY_COUPON' }
  | { type: 'REJECT_COUPON' }
  | { type: 'RESET_COUPON' }
  | { type: 'TOGGLE_WALLET' }
  | { type: 'SET_GATEWAY'; payload: string }
  | { type: 'SET_CUSTOMER_NOTE'; payload: string }
  | { type: 'SET_INVOICE'; payload: InvoiceData }

const initialState: CheckoutState = {
  deliveryType: 'DELIVERY',
  selectedAddressId: null,
  isAddressModalOpen: false,
  couponStatus: 'NONE',
  couponCode: '',
  couponApplied: false,
  useWallet: false,
  selectedGateway: 'ZARINPAL',
  customerNote: '',
  invoice: null,
}

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'SET_DELIVERY_TYPE': return { ...state, deliveryType: action.payload }
    case 'SELECT_ADDRESS': return { ...state, selectedAddressId: action.payload }
    case 'OPEN_ADDRESS_MODAL': return { ...state, isAddressModalOpen: true }
    case 'CLOSE_ADDRESS_MODAL': return { ...state, isAddressModalOpen: false }
    case 'SET_COUPON_STATUS': return { ...state, couponStatus: action.payload }
    case 'SET_COUPON_CODE': return { ...state, couponCode: action.payload }
    case 'APPLY_COUPON': return { ...state, couponApplied: true }
    case 'REJECT_COUPON': return { ...state, couponApplied: false }
    case 'RESET_COUPON': return { ...state, couponStatus: 'NONE', couponCode: '', couponApplied: false }
    case 'TOGGLE_WALLET': return { ...state, useWallet: !state.useWallet }
    case 'SET_GATEWAY': return { ...state, selectedGateway: action.payload }
    case 'SET_CUSTOMER_NOTE': return { ...state, customerNote: action.payload.slice(0, 300) }
    case 'SET_INVOICE': return { ...state, invoice: action.payload }
    default: return state
  }
}

// --- هوک ---
export function useCheckoutPage(deps: {
  walletBalance: number
  items: { productId: string; sizeId?: string | null; quantity: number }[]
}) {
  const { walletBalance, items } = deps
  const [state, dispatch] = useReducer(checkoutReducer, initialState)
  const queryClient = useQueryClient()
  const clearCart = useCartStore((s) => s.clearCart)
  const setActiveOrderId = useAuthStore((s) => s.setActiveOrderId)
  const showToast = useToastStore((s) => s.showToast)

  // ⬅ کوئری جزئیات — داخل هوک: آیتم‌ها + نوع تحویل + آدرس
  // هر تغییر انتخاب → هزینه‌ی ناحیه‌ای زنده آپدیت می‌شه
  // کلید ساختاری از qk (بدون JSON.stringify) + placeholderData از فکتوری
  const { data: checkoutData, isLoading: isDetailsLoading } = useQuery({
    ...checkoutDetailsOptions(items, state.deliveryType, state.selectedAddressId),
    enabled: items.length > 0,
  })

  // ساب‌توتال و هزینه ارسال — از سرور (ناحیه‌ای)؛ حضوری = صفر از خود سرور
  const subtotal = checkoutData?.subtotal ?? 0
  const deliveryFee = checkoutData?.deliveryFee ?? 0

  // تخفیف و کیف پول — نمایشی (سرور موقع پرداخت مرجعه)
  const calc = useMemo<CheckoutCalculation>(() => {
    const discount = state.couponApplied ? Math.round(subtotal * COUPON_PERCENT / 100) : 0
    const payableFood = Math.max(0, subtotal - discount)
    const walletDeduction = state.useWallet ? Math.min(walletBalance, payableFood) : 0
    const total = payableFood + deliveryFee
    const amountPaidOnline = total - walletDeduction
    return { discount, payableFood, walletDeduction, deliveryFee, total, amountPaidOnline }
  }, [state.couponApplied, state.useWallet, subtotal, deliveryFee, walletBalance])

  const isGatewayDisabled = calc.amountPaidOnline === 0
  const isSubmitBlocked = state.couponStatus === 'HAVE' && !state.couponApplied

  // --- هندلرها ---
  const handleDeliveryTypeChange = useCallback((t: DeliveryType) => dispatch({ type: 'SET_DELIVERY_TYPE', payload: t }), [])
  const handleSelectAddress = useCallback((id: string) => dispatch({ type: 'SELECT_ADDRESS', payload: id }), [])
  const handleOpenAddressModal = useCallback(() => dispatch({ type: 'OPEN_ADDRESS_MODAL' }), [])
  const handleCloseAddressModal = useCallback(() => dispatch({ type: 'CLOSE_ADDRESS_MODAL' }), [])
  const handleCouponStatusChange = useCallback((s: CouponStatus) => {
    if (s === 'NONE') dispatch({ type: 'RESET_COUPON' })
    else dispatch({ type: 'SET_COUPON_STATUS', payload: s })
  }, [])
  const handleCouponCodeChange = useCallback((raw: string) => {
    const sanitized = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20)
    dispatch({ type: 'SET_COUPON_CODE', payload: sanitized })
  }, [])
  const handleApplyCoupon = useCallback(() => {
    if (state.couponCode === VALID_COUPON) {
      dispatch({ type: 'APPLY_COUPON' })
      showToast('کد تخفیف اعمال شد (۲۰٪ تخفیف)')
    } else if (!state.couponCode) {
      showToast('لطفاً کد تخفیف را وارد کنید', 'error')
    } else {
      dispatch({ type: 'REJECT_COUPON' })
      showToast('کد تخفیف نامعتبر است', 'error')
    }
  }, [state.couponCode, showToast])
  const handleToggleWallet = useCallback(() => dispatch({ type: 'TOGGLE_WALLET' }), [])
  const handleGatewayChange = useCallback((id: string) => dispatch({ type: 'SET_GATEWAY', payload: id }), [])
  const handleCustomerNoteChange = useCallback((v: string) => dispatch({ type: 'SET_CUSTOMER_NOTE', payload: v }), [])

  // --- ثبت سفارش ---
  const checkoutMutation = useMutation({
    mutationFn: (payload: CheckoutSubmitPayload) => processCheckout({ data: payload }),
    onSuccess: (res) => {
      // qk — پروفایل (کیف پول/سفارش‌ها) و لیست لایو ادمین۲ (سفارش تازه) همگام می‌شن
      queryClient.invalidateQueries({ queryKey: qk.userProfile })
      // پریفکس بدون adminId — چون adminId اینجا در دسترس نیست؛ همه‌ی instanceها رفرش می‌شن
      queryClient.invalidateQueries({ queryKey: qk.admin2LiveOrdersPrefix })
      clearCart()
      if (res.paymentStatus === 'SUCCESS' && res.invoice) {
        setActiveOrderId(res.invoice.orderId)
        dispatch({ type: 'SET_INVOICE', payload: res.invoice })
      } else {
        setActiveOrderId(null)
        showToast('پرداخت ناموفق — سفارش در لیست شما با وضعیت «پرداخت ناموفق» ثبت شد', 'error')
      }
    },
    onError: (err) => showToast(err.message || 'خطا در پردازش سفارش', 'error'),
  })

  const handleFinalSubmit = useCallback(() => {
    if (state.deliveryType === 'DELIVERY' && !state.selectedAddressId) {
      showToast('لطفاً آدرس تحویل را انتخاب کنید', 'error')
      return
    }
    if (isSubmitBlocked) {
      showToast('ابتدا کد تخفیف را اعمال یا حذف کنید', 'error')
      return
    }
    const payload: CheckoutSubmitPayload = {
      items,
      deliveryType: state.deliveryType,
      useWallet: state.useWallet,
      addressId: state.selectedAddressId,
      customerNote: state.customerNote.trim(),
      couponCode: state.couponApplied ? state.couponCode : null,
      gatewayId: isGatewayDisabled ? null : state.selectedGateway,
    }
    checkoutMutation.mutate(payload)
  }, [state, items, isSubmitBlocked, isGatewayDisabled, showToast, checkoutMutation])

  return {
    state, calc, checkoutData, isDetailsLoading, isGatewayDisabled, isSubmitBlocked,
    checkoutMutation,
    handleDeliveryTypeChange, handleSelectAddress,
    handleOpenAddressModal, handleCloseAddressModal,
    handleCouponStatusChange, handleCouponCodeChange, handleApplyCoupon,
    handleToggleWallet, handleGatewayChange, handleCustomerNoteChange,
    handleFinalSubmit,
  }
}