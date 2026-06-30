import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Colors, Radius, Spacing, TAB_BAR_SPACE } from "@/constants/theme";
import {
  cancelAllNotifications,
  getNotificationSettings,
  rescheduleAllNotifications,
  updateNotificationSettings,
} from "@/services/notifications";
import { useAuthStore } from "@/stores/auth-store";
import { useDocStore } from "@/stores/doc-store";
import { analyzePassword, validatePassword } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface MenuItemProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
}

function MenuItem({
  icon,
  label,
  onPress,
  value,
  toggle,
  toggleValue,
  onToggle,
  danger,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={toggle ? 1 : 0.7}
    >
      <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? Colors.error : Colors.primary}
        />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
      <View style={styles.menuRight}>
        {value ? <Text style={styles.menuValue}>{value}</Text> : null}
        {toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: Colors.gray200, true: Colors.primary }}
          />
        ) : (
          !danger && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.gray300}
            />
          )
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MyPageScreen() {
  const router = useRouter();
  const documents = useDocStore((state) => state.documents);
  const {
    user,
    logout,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
    updateNickname,
    verifyPassword,
    updatePassword,
  } = useAuthStore();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(user?.nickname ?? "");
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"verify" | "change">(
    "verify",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nicknameMessage, setNicknameMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { typeCount: newPwTypeCount, strengthLabel: newPwStrengthLabel } =
    useMemo(() => analyzePassword(newPassword), [newPassword]);

  const newPwStrengthColor =
    newPwTypeCount === 0
      ? Colors.gray500
      : newPwTypeCount === 1
        ? Colors.error
        : newPwTypeCount === 2
          ? Colors.warning
          : Colors.success;

  const storagePercent = user
    ? Math.min(100, Math.round((user.storageUsed / user.storageLimit) * 100))
    : 0;

  useEffect(() => {
    setNicknameInput(user?.nickname ?? "");
  }, [user]);

  useEffect(() => {
    getNotificationSettings()
      .then((settings) => {
        setPushEnabled(settings.app_push_enabled);
        setEmailEnabled(settings.email_enabled);
      })
      .catch((error) => console.log("알림 설정 조회 실패:", error));
  }, []);

  const handleOpenNicknameEdit = () => {
    setSettingsModalVisible(false);
    setNicknameInput(user?.nickname ?? "");
    setNicknameMessage(null);
    setNicknameModalVisible(true);
  };

  const handleCloseNicknameEdit = () => {
    setNicknameModalVisible(false);
    setNicknameMessage(null);
    setNicknameInput(user?.nickname ?? "");
  };

  const handlePushToggle = async (value: boolean) => {
    setPushEnabled(value);
    try {
      if (value) {
        await rescheduleAllNotifications(documents);
      } else {
        await cancelAllNotifications();
      }
      await updateNotificationSettings({ app_push_enabled: value });
    } catch (error) {
      console.log("알림 설정 업데이트 실패:", error);
    }
  };

  const handleEmailToggle = async (value: boolean) => {
    setEmailEnabled(value);
    updateNotificationSettings({ email_enabled: value }).catch((error) =>
      console.log("알림 설정 업데이트 실패:", error),
    );
  };

  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: logout },
    ]);
  };

  const handleSaveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      setNicknameMessage("닉네임을 입력해주세요.");
      return;
    }
    if (trimmed === user?.nickname) {
      setNicknameMessage("변경 사항이 없습니다.");
      return;
    }
    updateNickname(trimmed);
    setNicknameMessage("닉네임이 저장되었습니다.");
  };

  const handleStartPasswordChange = () => {
    setSettingsModalVisible(false);
    setPasswordModalVisible(true);
    setPasswordStep("verify");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword) {
      setPasswordError("현재 비밀번호를 입력해주세요.");
      return;
    }
    if (!(await verifyPassword(currentPassword))) {
      setPasswordError("현재 비밀번호가 올바르지 않습니다.");
      return;
    }
    setPasswordStep("change");
    setPasswordError(null);
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }

    const passwordErr = validatePassword(newPassword);
    if (passwordErr) {
      setPasswordError(passwordErr);
      return;
    }

    try {
      await updatePassword(currentPassword, newPassword);
      setPasswordModalVisible(false);
      setPasswordStep("verify");
      setPasswordError(null);
      setPasswordMessage("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError(
        "비밀번호 변경에 실패했습니다. 현재 비밀번호를 다시 확인해주세요.",
      );
    }
  };

  const handleWithdraw = () => {
    Alert.alert(
      "회원탈퇴",
      "탈퇴하면 모든 데이터가 삭제됩니다.\n정말 탈퇴하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { text: "탈퇴", style: "destructive", onPress: logout },
      ],
    );
  };

  const handlePinReset = () => {
    setSettingsModalVisible(false);
    router.push("/(auth)/pin-setup" as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person" size={36} color={Colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.nickname}>{user?.nickname ?? "사용자"}</Text>
              <Text style={styles.email} numberOfLines={1}>
                {user?.email ?? "-"}
              </Text>
              <View
                style={[
                  styles.planBadge,
                  user?.plan === "pro"
                    ? styles.planBadgePro
                    : styles.planBadgeFree,
                ]}
              >
                <Text
                  style={[
                    styles.planText,
                    user?.plan === "pro"
                      ? styles.planTextPro
                      : styles.planTextFree,
                  ]}
                  numberOfLines={1}
                >
                  {user?.plan === "pro" ? "Pro" : "Free"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.profileBottom}>
            <TouchableOpacity
              onPress={() => setSettingsModalVisible(true)}
              style={styles.settingsButton}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {passwordMessage ? (
          <Text style={styles.noticeText}>{passwordMessage}</Text>
        ) : null}

        <View style={styles.storageCard}>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>스토리지 사용량</Text>
            <Text style={styles.storageValue}>
              {user?.storageUsed.toFixed(1) ?? "0.0"}GB /{" "}
              {user?.storageLimit ?? 0}GB
            </Text>
          </View>
          <View style={styles.storageBar}>
            <View
              style={[
                styles.storageBarFill,
                { width: `${storagePercent}%` as any },
              ]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 설정</Text>
          <MenuItem
            icon="notifications-outline"
            label="앱 푸시 알림"
            onPress={() => {}}
            toggle
            toggleValue={pushEnabled}
            onToggle={handlePushToggle}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="mail-outline"
            label="이메일 알림"
            onPress={() => {}}
            toggle
            toggleValue={emailEnabled}
            onToggle={handleEmailToggle}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>요금제 관리</Text>
          {user?.plan === "free" ? (
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => router.push("/pro-promotion" as any)}
            >
              <View style={styles.upgradeCopy}>
                <Text style={styles.upgradeTitle}>Pro로 업그레이드</Text>
                <Text style={styles.upgradeDesc}>
                  AI 소비분석 · 월별 리포트 · 마스킹 기능
                </Text>
              </View>
              <View style={styles.upgradeArrow}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={Colors.white}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <MenuItem
              icon="star-outline"
              label="Pro 플랜 관리"
              onPress={() => router.push("/pro-promotion" as any)}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기타</Text>
          <MenuItem
            icon="document-text-outline"
            label="이용약관"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="shield-outline"
            label="개인정보처리방침"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="information-circle-outline"
            label="앱 버전"
            onPress={() => {}}
            value="1.0.0"
          />
        </View>

        <View style={styles.section}>
          <MenuItem
            icon="log-out-outline"
            label="로그아웃"
            onPress={handleLogout}
            danger
          />
          <View style={styles.divider} />
          <MenuItem
            icon="trash-outline"
            label="회원탈퇴"
            onPress={handleWithdraw}
            danger
          />
        </View>
      </ScrollView>

      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>계정 설정</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.gray500} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalMenu}>
              <MenuItem
                icon="pencil-outline"
                label="닉네임 수정"
                onPress={handleOpenNicknameEdit}
                value={user?.nickname}
              />
              <View style={styles.divider} />
              <MenuItem
                icon="lock-closed-outline"
                label="비밀번호 변경"
                onPress={handleStartPasswordChange}
              />
              <View style={styles.divider} />
              <MenuItem
                icon="keypad-outline"
                label="PIN 번호 재설정"
                onPress={handlePinReset}
              />
              <View style={styles.divider} />
              <MenuItem
                icon="finger-print-outline"
                label="생체인증"
                onPress={() => {}}
                toggle
                toggleValue={isBiometricEnabled}
                onToggle={(value) =>
                  value ? enableBiometric() : disableBiometric()
                }
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={nicknameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseNicknameEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>닉네임 수정</Text>
              <TouchableOpacity onPress={handleCloseNicknameEdit}>
                <Ionicons name="close" size={22} color={Colors.gray500} />
              </TouchableOpacity>
            </View>
            <Input
              label="닉네임"
              placeholder="닉네임 입력"
              value={nicknameInput}
              onChangeText={(text) => {
                setNicknameInput(text);
                setNicknameMessage(null);
              }}
            />
            {nicknameMessage ? (
              <Text style={styles.noticeText}>{nicknameMessage}</Text>
            ) : null}
            <Button label="저장" onPress={handleSaveNickname} />
            <Button
              label="닫기"
              variant="outline"
              onPress={handleCloseNicknameEdit}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={passwordModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>비밀번호 변경</Text>
            {passwordStep === "verify" ? (
              <>
                <Text style={styles.modalDescription}>
                  기존 비밀번호를 입력하면 새 비밀번호를 설정할 수 있습니다.
                </Text>
                <Input
                  label="기존 비밀번호"
                  placeholder="현재 비밀번호 입력"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  isPassword
                />
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}
                <Button label="확인" onPress={handleVerifyCurrentPassword} />
                <Button
                  label="취소"
                  variant="outline"
                  onPress={() => {
                    setPasswordModalVisible(false);
                    setPasswordError(null);
                  }}
                />
              </>
            ) : (
              <>
                <Text style={styles.modalDescription}>
                  새 비밀번호를 입력하고 확인해 주세요.
                </Text>
                <Input
                  label="새 비밀번호"
                  placeholder="8자 이상 입력"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  isPassword
                />
                <Text style={styles.passwordHint}>
                  영문, 숫자, 특수문자 중 2개 이상 포함해야 합니다.
                </Text>
                {newPassword.length > 0 ? (
                  <Text
                    style={[
                      styles.passwordStrength,
                      { color: newPwStrengthColor },
                    ]}
                  >
                    비밀번호 강도: {newPwStrengthLabel}
                  </Text>
                ) : null}
                <Input
                  label="비밀번호 확인"
                  placeholder="새 비밀번호 재입력"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  isPassword
                />
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}
                <Button label="변경하기" onPress={handleUpdatePassword} />
                <Button
                  label="이전"
                  variant="outline"
                  onPress={() => {
                    setPasswordStep("verify");
                    setPasswordError(null);
                  }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: Colors.gray900 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: TAB_BAR_SPACE,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...cardShadow,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1, gap: Spacing.xs, minWidth: 0 },
  profileBottom: { alignItems: "flex-end" },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },
  nickname: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  email: { fontSize: 13, color: Colors.gray500 },
  planBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: "flex-start",
  },
  planBadgeFree: { backgroundColor: Colors.gray100 },
  planBadgePro: { backgroundColor: Colors.proLight },
  planText: { fontSize: 12, fontWeight: "700" },
  planTextFree: { color: Colors.gray500 },
  planTextPro: { color: Colors.pro },
  noticeText: { fontSize: 13, color: Colors.primary, marginTop: Spacing.sm },
  storageCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...cardShadow,
  },
  storageRow: { flexDirection: "row", justifyContent: "space-between" },
  storageLabel: { fontSize: 14, color: Colors.gray600, fontWeight: "500" },
  storageValue: { fontSize: 13, color: Colors.gray500 },
  storageBar: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  storageBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: "hidden",
    ...cardShadow,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.gray400,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconDanger: { backgroundColor: Colors.errorLight },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.gray800,
    fontWeight: "500",
  },
  menuLabelDanger: { color: Colors.error },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  menuValue: { fontSize: 14, color: Colors.gray400 },
  divider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginLeft: Spacing.lg + 36 + Spacing.md,
  },
  upgradeBtn: {
    margin: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  upgradeCopy: { flex: 1 },
  upgradeTitle: { fontSize: 15, fontWeight: "700", color: Colors.white },
  upgradeDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  upgradeArrow: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  modalMenu: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  modalDescription: {
    fontSize: 13,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  passwordHint: { fontSize: 12, color: Colors.gray500 },
  passwordStrength: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
});
