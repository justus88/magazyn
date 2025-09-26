import { prisma } from '../lib/prisma';

const SETTINGS_SINGLETON_ID = 1;

function ensureSettings() {
  return prisma.systemSetting.upsert({
    where: { id: SETTINGS_SINGLETON_ID },
    update: {},
    create: { id: SETTINGS_SINGLETON_ID, allowSelfRegistration: false },
  });
}

export async function getSystemSettings() {
  return ensureSettings();
}

export async function setAllowSelfRegistration(allowSelfRegistration: boolean) {
  return prisma.systemSetting.upsert({
    where: { id: SETTINGS_SINGLETON_ID },
    update: { allowSelfRegistration },
    create: { id: SETTINGS_SINGLETON_ID, allowSelfRegistration },
  });
}
