import { useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export default function MessageScreen() {
  const { friendId, friendName } = useLocalSearchParams();

  const currentUser = useQuery(api.users.getCurrentUser);
  const currentUserId = currentUser?._id;

  const [text, setText] = useState("");

  const messages = useQuery(api.messages.getMessages, {
    userId: currentUserId!,
    friendId: friendId as Id<"users">,
  });

  const sendMessage = useMutation(api.messages.sendMessage);

  if (!currentUserId) {
    return <ThemedText>Loading...</ThemedText>;
  }

  const handleSend = async () => {
    if (!text.trim()) return;

    await sendMessage({
      senderId: currentUserId,
      receiverId: friendId as Id<"users">,
      text,
    });

    setText("");
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={{ flex: 1, padding: 10 }}>
        
        {/* Title */}
        <ThemedText type="title">{friendName}</ThemedText>

        {/* Messages */}
        <FlatList
          data={messages ?? []}
          keyExtractor={(item) => item._id.toString()}
          renderItem={({ item }) => {
            const isMe = item.senderId === currentUserId;

            return (
              <ThemedView
                style={[
                  styles.messageBubble,
                  {
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    backgroundColor: isMe ? "#007AFF" : "#E5E5EA",
                  },
                ]}
              >
                <ThemedText style={{ color: isMe ? "white" : "black" }}>
                  {item.text}
                </ThemedText>
              </ThemedView>
            );
          }}
        />

        {/* Input */}
        <ThemedView style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            style={styles.input}
          />

          <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
            <ThemedText style={{ color: "white" }}>Send</ThemedText>
          </TouchableOpacity>
        </ThemedView>

      </ThemedView>
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
    marginTop: 10,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginRight: 5,
  },

  sendBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    justifyContent: "center",
    borderRadius: 10,
  },
});
