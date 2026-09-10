// src/server/live-bridge.ts
import type { LiveOrder } from './admin'

type LiveOrderData = Omit<LiveOrder, never>

type Pusher = (order: LiveOrderData) => void
let pusher: Pusher | null = null

export function registerLivePusher(fn: Pusher) { pusher = fn }

export function pushLive(order: LiveOrderData) { pusher?.(order) }