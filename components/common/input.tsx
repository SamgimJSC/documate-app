import { Colors, Radius, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { forwardRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, containerStyle, isPassword = false, ...props },
  ref,
) {
  const [showPw, setShowPw] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrap,
          error ? styles.inputError : styles.inputNormal,
        ]}
      >
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={Colors.gray400}
          secureTextEntry={isPassword && !showPw}
          {...props}
          textContentType={isPassword ? "none" : props.textContentType}
          autoComplete={isPassword ? "off" : props.autoComplete}
          importantForAutofill={isPassword ? "no" : props.importantForAutofill}
          passwordRules={isPassword ? "" : props.passwordRules}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPw(!showPw)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showPw ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={Colors.gray400}
            />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.error, !error && styles.errorHidden]}>
        {error || " "}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: 14, fontWeight: "500", color: Colors.gray700 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },
  inputNormal: { borderColor: Colors.gray200 },
  inputError: { borderColor: Colors.error },
  input: { flex: 1, fontSize: 15, color: Colors.gray900, paddingVertical: 14 },
  eyeBtn: { padding: Spacing.xs },
  error: { fontSize: 12, color: Colors.error, minHeight: 18 },
  errorHidden: { color: "transparent" },
});
