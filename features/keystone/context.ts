import { getContext } from '@keystone-6/core/context'
import config from './index'
import { type Context } from '.keystone/types'
import * as PrismaModule from "@prisma/client";
import { assertOwnedLocalDatabase } from "./localRuntime";

// Making sure multiple prisma clients are not created during hot reloading
export const keystoneContext: Context =
  (globalThis as any).keystoneContext ?? getContext(config, PrismaModule)

export const ownedLocalRuntimeReady = assertOwnedLocalDatabase(keystoneContext.prisma)

if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).keystoneContext = keystoneContext
}