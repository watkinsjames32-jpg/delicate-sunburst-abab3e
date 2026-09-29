import { createServerFn } from '@tanstack/react-start'
import { hostedCheckoutLinks } from './hosted-checkout'

export const getHostedCheckoutLinks = createServerFn().handler(async () => hostedCheckoutLinks())
