import { useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

type LocalMessage = {
  _id: string;
  clientId: string;
  senderId: Id<"users">;
  receiverId: Id<"users">;
  text?: string;
  imageUrl?: string;
  createdAt: number;
  optimistic?: boolean;
};

export default function MessageScreen() {
  const { friendId, friendName } = useLocalSearchParams();

  const currentUser = useQuery(api.users.getCurrentUser);
  const currentUserId = currentUser?._id;

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);

  const flatListRef = useRef<FlatList>(null);

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "icon");

  const messages = useQuery(api.messages.getMessages, {
    userId: currentUserId!,
    friendId: friendId as Id<"users">,
  });

  const sendMessage = useMutation(api.messages.sendMessage);
  const generateUploadUrl = useMutation(api.messages.generateMessageUploadUrl);

  if (!currentUserId) return <ThemedText>Loading...</ThemedText>;

  const serverMessages = messages ?? [];

  /* -------------------------
     FIX DUPLICATES (SAFE MATCH)
  --------------------------*/
  const mergedMessages = [
    ...serverMessages,
    ...localMessages.filter((local) => {
      return !serverMessages.some(
        (s: any) =>
          s.clientId === local.clientId ||
          (s.text === local.text &&
            Math.abs(s.createdAt - local.createdAt) < 3000)
      );
    }),
  ].sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [messages, localMessages]);

  /* -------------------------
     SEND TEXT
  --------------------------*/
  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);

    const clientId = `${Date.now()}-${Math.random()}`;

    const optimistic: LocalMessage = {
      _id: clientId,
      clientId,
      senderId: currentUserId,
      receiverId: friendId as Id<"users">,
      text,
      createdAt: Date.now(),
      optimistic: true,
    };

    setLocalMessages((p) => [...p, optimistic]);
    setText("");

    try {
      await sendMessage({
        senderId: currentUserId,
        receiverId: friendId as Id<"users">,
        text,
        clientId,
      });
    } finally {
      setSending(false);
    }
  };

  /* -------------------------
     SEND IMAGE (FIXED PROPER FLOW)
  --------------------------*/
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (result.canceled) return;

    const image = result.assets[0];

    const uploadUrl = await generateUploadUrl();

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: await (await fetch(image.uri)).blob(),
    });

    const { storageId } = await res.json();

    const clientId = `${Date.now()}-${Math.random()}`;

    setLocalMessages((p) => [
      ...p,
      {
        _id: clientId,
        clientId,
        senderId: currentUserId,
        receiverId: friendId as Id<"users">,
        imageUrl: image.uri,
        createdAt: Date.now(),
        optimistic: true,
      },
    ]);

    await sendMessage({
      senderId: currentUserId,
      receiverId: friendId as Id<"users">,
      imageId: storageId,
      clientId,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ThemedView style={{ flex: 1, padding: 10 }}>
          <ThemedText type="title">{friendName}</ThemedText>

          <FlatList
            ref={flatListRef}
            data={mergedMessages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingVertical: 10 }}
            renderItem={({ item }) => {
              const isMe = item.senderId === currentUserId;

              return (
                <ThemedView
                  style={[
                    styles.messageBubble,
                    {
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      backgroundColor: isMe ? "#007AFF" : backgroundColor,
                      borderWidth: isMe ? 0 : 1,
                      borderColor,
                      opacity: item.optimistic ? 0.6 : 1,
                    },
                  ]}
                >
                  {item.imageUrl && (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{
                        width: 200,
                        height: 200,
                        borderRadius: 10,
                        marginBottom: item.text ? 8 : 0,
                      }}
                    />
                  )}

                  {item.text && (
                    <ThemedText style={{ color: isMe ? "white" : textColor }}>
                      {item.text}
                    </ThemedText>
                  )}
                </ThemedView>
              );
            }}
          />

          <ThemedView style={styles.inputRow}>
            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.imageBtn}
            >
              <ThemedText style={{ color: "white" }}>📷</ThemedText>
            </TouchableOpacity>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#888"
              style={[
                styles.input,
                {
                  backgroundColor,
                  color: textColor,
                  borderColor,
                },
              ]}
            />

            <TouchableOpacity
              onPress={handleSend}
              disabled={sending}
              style={[styles.sendBtn, { opacity: sending ? 0.6 : 1 }]}
            >
              <ThemedText style={{ color: "white" }}>Send</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 4,
    maxWidth: "70%",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 5,
  },
  sendBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 10,
  },
  imageBtn: {
    backgroundColor: "#34C759",
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 10,
  },
});
