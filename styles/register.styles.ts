import { Colors, Spacing } from "@/constants/theme";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },

  // register.styles.ts
  emailRow: {
    flexDirection: "row",
    alignItems: "flex-start", // flex-end → center
    gap: Spacing.sm,
  },

  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, fontWeight: "600", color: Colors.white },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  title: { fontSize: 22, fontWeight: "700", color: Colors.gray900 },
  subtitle: { fontSize: 14, color: Colors.gray500 },
  group: {
    gap: Spacing.xs,
  },

  emailInputWrap: { flex: 1 },
  sendBtn: {
    width: 60,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.gray300, // 비활성 기본값
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22, // 라벨 높이만큼 밀어주기
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sendBtnDisabled: {
    borderColor: Colors.gray300,
    backgroundColor: Colors.gray100,
  },
  sendBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray400, // 기본 비활성 글씨
    textAlign: "center",
    lineHeight: 16,
  },
  sendBtnTextActive: {
    color: Colors.white, // 활성화 글씨 흰색
  },
  sendBtnTextDisabled: {
    color: Colors.gray400,
  },
  availableText: { fontSize: 12, color: Colors.primary },
  unavailableText: { fontSize: 12, color: Colors.error },
  successMessage: { fontSize: 13, color: Colors.success, fontWeight: "600" },
  passwordStrength: { fontSize: 12, fontWeight: "600" },
  generalError: { fontSize: 14, color: Colors.error, textAlign: "center" },
  checkboxWrap: { gap: Spacing.xs },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxMark: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  checkboxLabel: { fontSize: 14, color: Colors.gray700 },
  checkboxRequired: { color: Colors.gray700 },
  checkboxRequiredError: { color: Colors.error },
  smallError: { fontSize: 12, color: Colors.error },
  loginRow: { flexDirection: "row", justifyContent: "center", gap: Spacing.xs },
  loginLabel: { fontSize: 14, color: Colors.gray500 },
  loginLink: { fontSize: 14, color: Colors.primary, fontWeight: "600" },
});
