import { PinPad } from "@/components/common/pin-pad";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = "enter" | "confirm";

export default function PinSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const source = params.source === "register";
  const setPin = useAuthStore((s) => s.setPin);
  const setPinVerified = useAuthStore((s) => s.setPinVerified);
  const [step, setStep] = useState<Step>("enter");
  const [firstPin, setFirstPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const handleEnter = (val: string) => {
    setFirstPin(val);
    if (val.length === 6) {
      setStep("confirm");
    }
  };

  const handleConfirm = (val: string) => {
    setConfirmPin(val);
    if (val.length === 6) {
      if (val === firstPin) {
        setPin(val);
        setPinVerified(true);
        if (source) {
          router.replace("/(auth)/biometric-setup" as any);
        } else {
          router.replace("/(tabs)" as any);
        }
      } else {
        setError("PIN이 일치하지 않습니다. 다시 시도해주세요.");
        setConfirmPin("");
        setFirstPin("");
        setStep("enter");
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🔐</Text>
        </View>
        <Text style={styles.title}>
          {step === "enter" ? "PIN 번호 설정" : "PIN 번호 확인"}
        </Text>
        <Text style={styles.desc}>
          {step === "enter"
            ? "앱 보안을 위한 6자리 PIN을 설정해주세요."
            : "확인을 위해 PIN을 다시 입력해주세요."}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PinPad
          value={step === "enter" ? firstPin : confirmPin}
          onChange={step === "enter" ? handleEnter : handleConfirm}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: "700", color: Colors.gray900 },
  desc: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: "center",
    lineHeight: 22,
  },
  error: { fontSize: 14, color: Colors.error, textAlign: "center" },
});
