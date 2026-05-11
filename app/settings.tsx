// app/settings.tsx

import { api } from "@/convex/_generated/api";
import ProfileImage from "@/components/ProfileImage";
import { useMutation, useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const user = useQuery(api.users.getCurrentUser);

  const updateProfile = useMutation(
    api.users.updateProfile
  );

  const updateAccountSettings = useMutation(
    api.users.updateAccountSettings
  );

  const changePassword = useMutation(
    api.users.changePassword
  );

  const profilePictureUrl = useQuery(
    api.users.getProfilePictureUrl,
    user?.profilePicture
      ? { storageId: user.profilePicture }
      : "skip"
  );

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [bio, setBio] = useState("");

  const [email, setEmail] =
    useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  useEffect(() => {
    if (!user) return;

    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setUsername(user.username || "");
    setBio(user.bio || "");
    setEmail(user.email || "");
  }, [user]);

  const handleSave = async () => {
    Alert.alert(
      "Confirm Changes",
      "Are you sure you want to save these changes?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Save",
          onPress: async () => {
            try {
              await updateProfile({
                username,
                bio,
              });

              await updateAccountSettings({
                firstName,
                lastName,
                email,
              });

              // PASSWORD CHANGE
              if (
                currentPassword.trim() &&
                newPassword.trim()
              ) {
                await changePassword({
                  oldPassword:
                    currentPassword,
                  newPassword,
                });
              }

              Alert.alert(
                "Success",
                "Settings updated successfully"
              );

              setCurrentPassword("");
              setNewPassword("");
            } catch (e: any) {
              Alert.alert(
                "Error",
                e.message
              );
            }
          },
        },
      ]
    );
  };

  const backgroundColor = isDark
    ? "#121212"
    : "#fff";

  const textColor = isDark
    ? "#fff"
    : "#000";

  const inputBg = isDark
    ? "#1f1f1f"
    : "#f3f3f3";

  if (!user) return null;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: textColor,
            }}
          >
            Back
          </Text>
        </TouchableOpacity>

        <View
          style={{
            alignItems: "center",
            marginBottom: 25,
          }}
        >
          <ProfileImage
            uri={profilePictureUrl}
            editable
            size={110}
          />
        </View>

        <SettingInput
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
          textColor={textColor}
          inputBg={inputBg}
        />

        <SettingInput
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
          textColor={textColor}
          inputBg={inputBg}
        />

        <SettingInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          textColor={textColor}
          inputBg={inputBg}
        />

        <SettingInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          textColor={textColor}
          inputBg={inputBg}
        />

        {/* PASSWORDS */}

        <SettingInput
          label="Current Password"
          value={currentPassword}
          onChangeText={
            setCurrentPassword
          }
          textColor={textColor}
          inputBg={inputBg}
          secureTextEntry
        />

        <SettingInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          textColor={textColor}
          inputBg={inputBg}
          secureTextEntry
        />

        <SettingInput
          label="Bio"
          value={bio}
          onChangeText={setBio}
          textColor={textColor}
          inputBg={inputBg}
          multiline
        />

        <TouchableOpacity
          onPress={handleSave}
          style={{
            backgroundColor: "#000",
            padding: 14,
            borderRadius: 12,
            marginTop: 25,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "700",
            }}
          >
            Save Changes
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingInput({
  label,
  value,
  onChangeText,
  textColor,
  inputBg,
  multiline = false,
  secureTextEntry = false,
}: any) {
  return (
    <View
      style={{
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          color: textColor,
          marginBottom: 8,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        secureTextEntry={
          secureTextEntry
        }
        style={{
          backgroundColor: inputBg,
          padding: 14,
          borderRadius: 12,
          color: textColor,
          minHeight: multiline
            ? 100
            : undefined,
          textAlignVertical:
            multiline
              ? "top"
              : "center",
        }}
      />
    </View>
  );
}
