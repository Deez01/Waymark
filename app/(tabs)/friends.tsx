// Name: Bryan Estrada-Cordoba

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Alert, FlatList, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default function FriendScreen() {
    const inputBackground = useThemeColor({}, "background");
    const textColor = useThemeColor({}, "text");
    const borderColor = useThemeColor({}, "icon")

    const [query, setQuery] = useState("");
    const [pending, setPending] = useState<Id<"users">[]>([]);
    const [openMenuFriendId, setOpenMenuFriendId] = useState<Id<"users"> | null>(null);

    // Current User
    const currentUser = useQuery(api.users.getCurrentUser);
    const currentUserId = currentUser?._id;

    if (!currentUserId) {
        return <ThemedText>Loading user ... </ThemedText>;
    }

    // Queries
    const results = useQuery(api.friends.searchUsers, {
        search: query, 
        currentUserId,
    });

    const incoming = useQuery(api.friends.getIncomingRequests, {
        userId: currentUserId,
    });

    const friends = useQuery(api.friends.listFriends, {
        userId: currentUserId,
    });

    const friendIds = friends?.map((f) => f._id) ?? [];

    type IncomingRequest = FunctionReturnType<
    typeof api.friends.getIncomingRequests
    >[number];

    type Friend = FunctionReturnType<
    typeof api.friends.listFriends
    >[number];

    // Mutation
    const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
    const respondToRequest = useMutation(api.friends.respondToRequest);
    const removeFriend = useMutation(api.friends.removeFriend);

    // Loading pending UI state
    const handleSend = async (user: { _id: Id<"users"> }) => {
        if (pending.includes(user._id)) return;

        setPending((prev) => [...prev, user._id]);

        try {
            await sendFriendRequest({
                senderId: currentUserId,
                receiverId: user._id,
            });
        } catch (err) {
            setPending((prev) => prev.filter(id => id != user._id));
            Alert.alert("Error", "Failed to send friend request.")
        }
    };

    // Delete friend with confirmation
    const handleDeleteFriend = (friendId: Id<"users">) => {
        Alert.alert(
            "Remove Friend", 
            "Are you sure you want to remove this friend?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () =>
                        removeFriend({
                            userId: currentUserId,
                            friendId,
                    }),
                },
            ]
        );
    };

      return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={{ flex: 1, padding: 16 }}>
        {/* Title */}
        <ThemedText type="title" style={{ marginBottom: 10 }}>
          Friends
        </ThemedText>

        {/* Search Bar */}
        <TextInput
          placeholder="Search users..."
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          style={{
            borderWidth: 1,
            borderColor: borderColor,
            borderRadius: 10,
            padding: 10,
            marginBottom: 15,
            backgroundColor: inputBackground,
            color: textColor,
          }}
        />

        {/* Main FlatList */}
        <FlatList
          data={results ?? []}
          keyExtractor={(item) => item._id.toString()}
          ListHeaderComponent={
            <>
              {results === undefined ? (
                <ThemedText>Loading...</ThemedText>
              ) : results.length === 0 && query.length > 0 ? (
                <ThemedText>No users found.</ThemedText>
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <ThemedView
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: borderColor,
              }}
            >
              <ThemedText>
                {item.username ??
                  (`${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() ||
                    "Unknown")}
              </ThemedText>

              {/* Add Friend Button */}
              <TouchableOpacity
                disabled={pending.includes(item._id) || friendIds.includes(item._id)}
                onPress={() => handleSend(item)}
                style={{
                  backgroundColor: friendIds.includes(item._id)
                    ? "#34C759"
                    : pending.includes(item._id)
                    ? "#999"
                    : "#007AFF",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <ThemedText style={{ color: "white" }}>
                  {friendIds.includes(item._id) ? "Friends" : "Add Friend"}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}
          ListFooterComponent={
            <>
              {/* Incoming Requests */}
              <ThemedText type="subtitle" style={{ marginTop: 25 }}>
                Incoming Requests
              </ThemedText>

              {incoming?.map((req: IncomingRequest) => (
                <ThemedView
                  key={req.requestId.toString()}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 0.5,
                    borderBottomColor: borderColor,
                  }}
                >
                  <ThemedText>{req.senderName}</ThemedText>

                  <ThemedView style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() =>
                        respondToRequest({
                          requestId: req.requestId,
                          action: "accepted",
                        })
                      }
                      style={{
                        backgroundColor: "#34C759",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                    >
                      <ThemedText style={{ color: "white" }}>Accept</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        respondToRequest({
                          requestId: req.requestId,
                          action: "rejected",
                        })
                      }
                      style={{
                        backgroundColor: "#FF3B30",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                    >
                      <ThemedText style={{ color: "white" }}>Reject</ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                </ThemedView>
              ))}

              {/* Friends List with two-step menu */}
              <ThemedText type="subtitle" style={{ marginTop: 25 }}>
                My Friends
              </ThemedText>

              {friends?.length === 0 ? (
                <ThemedText style={{ marginTop: 5 }}>
                  You don't have any friends yet.
                </ThemedText>
              ) : (
                friends?.map((f: Friend) => (
                  <ThemedView
                    key={f._id.toString()}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 10,
                      borderBottomWidth: 0.5,
                      borderBottomColor: borderColor,
                    }}
                  >
                    <ThemedText>{f.name}</ThemedText>

                    <ThemedView style={{ flexDirection: "row", alignItems: "center" }}>
                      {/* Three-dot menu */}
                      <TouchableOpacity
                        onPress={() =>
                          setOpenMenuFriendId(openMenuFriendId === f._id ? null : f._id)
                        }
                        style={{ padding: 6 }}
                      >
                        <MaterialIcons name="more-vert" size={24} color={textColor} />
                      </TouchableOpacity>

                      {/* Delete button appears only when menu is open */}
                      {openMenuFriendId === f._id && (
                        <TouchableOpacity
                          onPress={() => {
                            setOpenMenuFriendId(null); // close menu
                            handleDeleteFriend(f._id); // confirmation
                          }}
                          style={{
                            marginLeft: 10,
                            backgroundColor: "#FF3B30",
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                          }}
                        >
                          <ThemedText style={{ color: "white" }}>Delete</ThemedText>
                        </TouchableOpacity>
                      )}
                    </ThemedView>
                  </ThemedView>
                ))
              )}
            </>
          }
        />
      </ThemedView>
    </SafeAreaView>
  );
}
