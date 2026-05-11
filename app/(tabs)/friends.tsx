// Name: Bryan Estrada-Cordoba

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import ViewEditPinSheet from "@/components/ViewEditPinSheet";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const borderColor = useThemeColor({}, "icon");

  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Id<"users">[]>([]);
  const [openMenuFriendId, setOpenMenuFriendId] =
    useState<Id<"users"> | null>(null);
  const [shareResponding, setShareResponding] = useState<Id<"sharedPins">[]>([]);
  const [previewRequestId, setPreviewRequestId] = useState<Id<"sharedPins"> | null>(null);
  const [previewPinId, setPreviewPinId] = useState<Id<"pins"> | null>(null);
  const [selectedPreviewPin, setSelectedPreviewPin] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAwaitingPreview, setIsAwaitingPreview] = useState(false);
  const [previewOpenTrigger, setPreviewOpenTrigger] = useState(0);

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

  const incomingShareRequests = useQuery(api.pins.getIncomingShareRequests);
  const previewPin = useQuery(
    api.pins.getPinById,
    previewPinId ? { pinId: previewPinId } : "skip"
  );

  const friendIds = friends?.map((f) => f._id) ?? [];

  type IncomingRequest = FunctionReturnType<
    typeof api.friends.getIncomingRequests
  >[number];

  type Friend = FunctionReturnType<
    typeof api.friends.listFriends
  >[number];

  type IncomingShareRequest = FunctionReturnType<
    typeof api.pins.getIncomingShareRequests
  >[number];

  // Mutations
  const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
  const respondToRequest = useMutation(api.friends.respondToRequest);
  const removeFriend = useMutation(api.friends.removeFriend);
  const respondToShareRequest = useMutation(api.pins.respondToShareRequest);

  const handleSend = async (user: { _id: Id<"users"> }) => {
    if (pending.includes(user._id)) return;

    setPending((prev) => [...prev, user._id]);

    try {
      await sendFriendRequest({
        senderId: currentUserId,
        receiverId: user._id,
      });
    } catch (err) {
      setPending((prev) => prev.filter((id) => id !== user._id));
      Alert.alert("Error", "Failed to send friend request.");
    }
  };

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

  const handleRespondToShare = async (
    requestId: Id<"sharedPins">,
    action: "accepted" | "rejected"
  ) => {
    if (shareResponding.includes(requestId)) return;
    setShareResponding((prev) => [...prev, requestId]);

    if (previewRequestId === requestId) {
      setIsPreviewOpen(false);
      setIsAwaitingPreview(false);
      setPreviewRequestId(null);
      setPreviewPinId(null);
      setSelectedPreviewPin(null);
    }

    try {
      await respondToShareRequest({ requestId, action });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to respond to share request.");
    } finally {
      setShareResponding((prev) => prev.filter((id) => id !== requestId));
    }
  };

  const handlePreviewShare = (requestId: Id<"sharedPins">, pinId: Id<"pins">) => {
    setIsPreviewOpen(false);
    setSelectedPreviewPin(null);
    setIsAwaitingPreview(true);
    setPreviewRequestId(requestId);
    setPreviewPinId(pinId);
  };

  useEffect(() => {
    if (!isAwaitingPreview) return;
    if (!previewPinId) return;
    if (previewPin === undefined) return;

    if (previewPin === null) {
      Alert.alert("Preview unavailable", "This shared pin is no longer available to preview.");
      setIsPreviewOpen(false);
      setIsAwaitingPreview(false);
      setPreviewRequestId(null);
      setPreviewPinId(null);
      setSelectedPreviewPin(null);
      return;
    }

    setSelectedPreviewPin(previewPin);
    setIsPreviewOpen(true);
    setIsAwaitingPreview(false);
    setPreviewOpenTrigger((prev) => prev + 1);
  }, [isAwaitingPreview, previewPinId, previewPin]);

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={{ flex: 1, padding: 16 }}>
        {/* Title */}
        <ThemedText type="title" style={{ marginBottom: 10 }}>
          Friends
        </ThemedText>

        {/* Search */}
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
                  (`${item.firstName ?? ""} ${
                    item.lastName ?? ""
                  }`.trim() || "Unknown")}
              </ThemedText>

              <TouchableOpacity
                disabled={
                  pending.includes(item._id) ||
                  friendIds.includes(item._id)
                }
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
                  {friendIds.includes(item._id)
                    ? "Friends"
                    : "Add Friend"}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}
          ListFooterComponent={
            <>
              {/* Incoming */}
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
                      <ThemedText style={{ color: "white" }}>
                        Accept
                      </ThemedText>
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
                      <ThemedText style={{ color: "white" }}>
                        Reject
                      </ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                </ThemedView>
              ))}

              {/* Friends */}
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

                    <ThemedView
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      {/* MESSAGE BUTTON */}
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: "/message",
                            params: {
                              friendId: f._id,
                              friendName: f.name,
                            },
                          })
                        }
                        style={{
                          backgroundColor: "#007AFF",
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          marginRight: 8,
                        }}
                      >
                        <ThemedText style={{ color: "white" }}>
                          Message
                        </ThemedText>
                      </TouchableOpacity>

                      {/* Menu */}
                      <TouchableOpacity
                        onPress={() =>
                          setOpenMenuFriendId(
                            openMenuFriendId === f._id ? null : f._id
                          )
                        }
                        style={{ padding: 6 }}
                      >
                        <MaterialIcons
                          name="more-vert"
                          size={24}
                          color={textColor}
                        />
                      </TouchableOpacity>

                      {/* Delete */}
                      {openMenuFriendId === f._id && (
                        <TouchableOpacity
                          onPress={() => {
                            setOpenMenuFriendId(null);
                            handleDeleteFriend(f._id);
                          }}
                          style={{
                            marginLeft: 10,
                            backgroundColor: "#FF3B30",
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                          }}
                        >
                          <ThemedText style={{ color: "white" }}>
                            Delete
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                    </ThemedView>
                  </ThemedView>
                ))
              )}

              <ThemedText type="subtitle" style={{ marginTop: 25 }}>
                Incoming Pin Shares
              </ThemedText>

              {incomingShareRequests === undefined ? (
                <ThemedText style={{ marginTop: 5 }}>Loading shares...</ThemedText>
              ) : incomingShareRequests.length === 0 ? (
                <ThemedText style={{ marginTop: 5 }}>No incoming pin shares.</ThemedText>
              ) : (
                incomingShareRequests.map((share: IncomingShareRequest) => {
                  if (!share) return null;
                  const isLoading = shareResponding.includes(share.requestId);
                  const isPreviewLoading = previewPinId?.toString() === share.pinId.toString() && isAwaitingPreview;

                  return (
                    <ThemedView
                      key={share.requestId.toString()}
                      style={{
                        paddingVertical: 10,
                        borderBottomWidth: 0.5,
                        borderBottomColor: borderColor,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handlePreviewShare(share.requestId, share.pinId)}
                        disabled={isLoading || isPreviewLoading}
                      >
                        <ThemedText style={{ fontWeight: "600" }}>{share.pinTitle}</ThemedText>
                        <ThemedText style={{ opacity: 0.8 }}>Shared by {share.sharedByName}</ThemedText>
                        {share.pinAddress ? (
                          <ThemedText style={{ opacity: 0.7, marginTop: 2 }} numberOfLines={1}>
                            {share.pinAddress}
                          </ThemedText>
                        ) : null}
                        {isPreviewLoading ? (
                          <ThemedView style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
                            <ActivityIndicator size="small" color="#62a0ea" />
                            <ThemedText style={{ opacity: 0.7, fontSize: 12 }}>
                              Loading preview...
                            </ThemedText>
                          </ThemedView>
                        ) : (
                          <ThemedText style={{ opacity: 0.6, marginTop: 4, fontSize: 12 }}>
                            Tap to preview pin details
                          </ThemedText>
                        )}
                      </TouchableOpacity>

                      <ThemedView style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                        <TouchableOpacity
                          onPress={() => handleRespondToShare(share.requestId, "accepted")}
                          disabled={isLoading}
                          style={{
                            backgroundColor: "#34C759",
                            padding: 6,
                            borderRadius: 6,
                            opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          <ThemedText style={{ color: "white" }}>Accept</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRespondToShare(share.requestId, "rejected")}
                          disabled={isLoading}
                          style={{
                            backgroundColor: "#FF3B30",
                            padding: 6,
                            borderRadius: 6,
                            opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          <ThemedText style={{ color: "white" }}>Reject</ThemedText>
                        </TouchableOpacity>
                      </ThemedView>
                    </ThemedView>
                  );
                })
              )}
            </>
          }
        />
      </ThemedView>

      <ViewEditPinSheet
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setIsAwaitingPreview(false);
          setPreviewRequestId(null);
          setPreviewPinId(null);
          setSelectedPreviewPin(null);
        }}
        pin={isPreviewOpen ? selectedPreviewPin : null}
        openTrigger={previewOpenTrigger}
      />
    </SafeAreaView>
  );
}
