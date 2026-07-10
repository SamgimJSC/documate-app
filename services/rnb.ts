import { NativeModules } from "react-native";

export type RnbBiometricType = "FACE" | "FINGER";

type BiometricsInstance = {
  isSensorAvailable: () => Promise<{
    available: boolean;
    biometryType?: string;
  }>;
  simplePrompt: (options: {
    promptMessage: string;
    cancelButtonText?: string;
  }) => Promise<{ success: boolean }>;
  biometricKeysExist: () => Promise<{ keysExist: boolean }>;
  deleteKeys: () => Promise<unknown>;
  createKeys: () => Promise<{ publicKey?: string }>;
  createSignature: (options: {
    promptMessage: string;
    payload: string;
    cancelButtonText?: string;
  }) => Promise<{ success: boolean; signature?: string }>;
};

type BiometricsModule = {
  default: new (options: {
    allowDeviceCredentials: boolean;
  }) => BiometricsInstance;
  BiometryTypes: {
    FaceID: string;
  };
};

let rnBiometrics: BiometricsInstance | null = null;
let faceIdType: string | null = null;

function assertNativeModuleAvailable(): void {
  if (!NativeModules.ReactNativeBiometrics) {
    throw new Error("BIOMETRIC_NATIVE_MODULE_UNAVAILABLE");
  }
}

function getBiometrics(): BiometricsInstance {
  assertNativeModuleAvailable();
  if (!rnBiometrics) {
    const biometricsModule = require("react-native-biometrics") as BiometricsModule;
    rnBiometrics = new biometricsModule.default({
      allowDeviceCredentials: false,
    });
    faceIdType = biometricsModule.BiometryTypes.FaceID;
  }
  return rnBiometrics;
}

function toPemPublicKey(base64PublicKey: string): string {
  const normalized = base64PublicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s/g, "");
  const lines = normalized.match(/.{1,64}/g)?.join("\n") ?? normalized;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`;
}

export async function getRnbBiometricType(): Promise<RnbBiometricType> {
  const biometrics = getBiometrics();
  const { available, biometryType } = await biometrics.isSensorAvailable();
  if (!available || !biometryType) {
    throw new Error("BIOMETRIC_NOT_AVAILABLE");
  }
  return biometryType === faceIdType ? "FACE" : "FINGER";
}

export async function createBiometricKeyPair(): Promise<{
  biometricType: RnbBiometricType;
  publicKey: string;
}> {
  const biometrics = getBiometrics();
  const biometricType = await getRnbBiometricType();
  const prompt = await biometrics.simplePrompt({
    promptMessage: "Register biometric authentication",
    cancelButtonText: "Cancel",
  });
  if (!prompt.success) {
    throw new Error("BIOMETRIC_CANCELLED");
  }

  const { keysExist } = await biometrics.biometricKeysExist();
  if (keysExist) await biometrics.deleteKeys();

  const { publicKey } = await biometrics.createKeys();
  if (!publicKey) throw new Error("BIOMETRIC_KEY_CREATION_FAILED");

  return {
    biometricType,
    publicKey: toPemPublicKey(publicKey),
  };
}

export async function signBiometricChallenge(
  challenge: string,
): Promise<string> {
  const biometrics = getBiometrics();
  const { keysExist } = await biometrics.biometricKeysExist();
  if (!keysExist) throw new Error("BIOMETRIC_KEY_NOT_FOUND");

  const { success, signature } = await biometrics.createSignature({
    promptMessage: "Log in with biometric authentication",
    payload: challenge,
    cancelButtonText: "Cancel",
  });
  if (!success || !signature) throw new Error("BIOMETRIC_CANCELLED");
  return signature;
}

export async function deleteBiometricKeys(): Promise<void> {
  const biometrics = getBiometrics();
  const { keysExist } = await biometrics.biometricKeysExist();
  if (keysExist) await biometrics.deleteKeys();
}
