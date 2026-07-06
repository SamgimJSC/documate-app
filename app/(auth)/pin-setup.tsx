import { PinPad } from "@/components/common/pin-pad";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { rememberPinLoginEmail } from "@/services/auth";
import { useAuthStore } from "@/stores/auth-store";
import axiosInstance from "@/utils/axios.util";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = "enter" | "confirm";

export default function PinSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    source?: string;
    email?: string;
    password?: string;
    nickname?: string;
    emailVerificationId?: string;
  }>();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (val: string) => {
    setConfirmPin(val);
    if (val.length === 6) {
      if (val === firstPin) {
        if (source) {
          setLoading(true);
          try {
            await axiosInstance.post("/auth/signup", {
              email: params.email,
              password: params.password,
              nickname: params.nickname,
              pinNumber: val,
              emailVerificationId: params.emailVerificationId,
            });
            await rememberPinLoginEmail(params.email ?? "");
            setPin(val);
            setPinVerified(true);
            setShowCompleteModal(true);
          } catch {
            setError("회원가입에 실패했습니다. 다시 시도해주세요.");
            setConfirmPin("");
            setFirstPin("");
            setStep("enter");
          } finally {
            setLoading(false);
          }
        } else {
          setPin(val);
          setPinVerified(true);
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

  const source = params.source === "register";
  const setPin = useAuthStore((s) => s.setPin);
  const setPinVerified = useAuthStore((s) => s.setPinVerified);
  const [step, setStep] = useState<Step>("enter");
  const [firstPin, setFirstPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const handleEnter = (val: string) => {
    setFirstPin(val);
    if (val.length === 6) {
      setStep("confirm");
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
      <Modal visible={showCompleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>회원가입 완료</Text>
            <Text style={styles.modalDescription}>
              PIN 등록이 완료되었습니다. 지금 바로 이용하거나 생체인증을 등록할
              수 있습니다.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalPrimary]}
              onPress={() => {
                useAuthStore.setState({
                  isAuthenticated: false,
                  isPinVerified: false,
                  token: null,
                });
                router.replace("/(auth)/login" as any);
              }}
            >
              <Text style={styles.modalPrimaryText}>이용을 시작하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSecondary]}
              onPress={() =>
                router.replace({
                  pathname: "/(auth)/biometric-setup",
                  params: { email: params.email ?? "" },
                })
              }
            >
              <Text style={styles.modalSecondaryText}>생체인증 등록하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  modalContent: {
    width: "100%",
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.gray900,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: "center",
    lineHeight: 20,
  },
  modalButton: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPrimary: { backgroundColor: Colors.primary },
  modalPrimaryText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  modalSecondary: { borderWidth: 1, borderColor: Colors.primary },
  modalSecondaryText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
});
