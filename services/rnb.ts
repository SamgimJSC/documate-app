import ReactNativeBiometrics, {
  BiometryTypes,
} from "react-native-biometrics";
import { NativeModules } from "react-native";

export type RnbBiometricType = "FACE" | "FINGER";

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: false,
});

function assertNativeModuleAvailable(): void {
  if (!NativeModules.ReactNativeBiometrics) {
    throw new Error("BIOMETRIC_NATIVE_MODULE_UNAVAILABLE");
  }
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
  assertNativeModuleAvailable();
  const { available, biometryType } = await rnBiometrics.isSensorAvailable();
  if (!available || !biometryType) {
    throw new Error("BIOMETRIC_NOT_AVAILABLE");
  }
  return biometryType === BiometryTypes.FaceID ? "FACE" : "FINGER";
}

export async function createBiometricKeyPair(): Promise<{
  biometricType: RnbBiometricType;
  publicKey: string;
}> {
  assertNativeModuleAvailable();
  const biometricType = await getRnbBiometricType();
  const prompt = await rnBiometrics.simplePrompt({
    promptMessage: "생체인증을 등록합니다",
    cancelButtonText: "취소",
  });
  if (!prompt.success) {
    throw new Error("BIOMETRIC_CANCELLED");
  }

  const { keysExist } = await rnBiometrics.biometricKeysExist();
  if (keysExist) await rnBiometrics.deleteKeys();

  const { publicKey } = await rnBiometrics.createKeys();
  if (!publicKey) throw new Error("BIOMETRIC_KEY_CREATION_FAILED");

  return {
    biometricType,
    publicKey: toPemPublicKey(publicKey),
  };
}

export async function signBiometricChallenge(
  challenge: string,
): Promise<string> {
  assertNativeModuleAvailable();
  const { keysExist } = await rnBiometrics.biometricKeysExist();
  if (!keysExist) throw new Error("BIOMETRIC_KEY_NOT_FOUND");

  const { success, signature } = await rnBiometrics.createSignature({
    promptMessage: "생체인증으로 로그인합니다",
    payload: challenge,
    cancelButtonText: "취소",
  });
  if (!success || !signature) throw new Error("BIOMETRIC_CANCELLED");
  return signature;
}

export async function deleteBiometricKeys(): Promise<void> {
  assertNativeModuleAvailable();
  const { keysExist } = await rnBiometrics.biometricKeysExist();
  if (keysExist) await rnBiometrics.deleteKeys();
}
