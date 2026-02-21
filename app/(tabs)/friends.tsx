// Name: Bryan Estrada-Cordoba

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
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

    type IncomingRequest = FunctionReturnType<
    typeof api.friends.getIncomingRequests
    >[number];

    type Friend = FunctionReturnType<
    typeof api.friends.listFriends
    >[number];

    // Mutation
    const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
    const respondToRequest = useMutation(api.friends.respondToRequest);

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

    return (
        <SafeAreaView style={styles.container}>
            <ThemedView style={{ flex: 1, padding: 16 }}>
                <ThemedText type="title" style={{marginBottom: 10 }}>
                    Friends
                </ThemedText>
                
                {/* Incoming Friend Requests */}
                <ThemedText type="subtitle" style={{ marginTop: 10 }}>Incoming Request </ThemedText>

                {incoming?.map((req: IncomingRequest) => (
                    <ThemedView   
                        key={req.requestId.toString()}
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingVertical: 8,
                        }}
                    >
                        <ThemedText>{req.senderName}</ThemedText>

                        <ThemedView style={{ flexDirection: "row", gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => 
                                respondToRequest({
                                    requestId: req.requestId,
                                    action: "accepted",
                                })
                            } 
                            style={{ backgroundColor: "#34C759", padding: 6, borderRadius: 6 }}
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
                            style={{ backgroundColor: "#FF3B30", padding: 6, borderRadius: 6}}
                        >
                            <ThemedText style={{ color: "white"}}>Reject</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                </ThemedView>
                ))}

                {/* Friend List */}
                <ThemedText style={{ fontSize: 18, margin: 10}}>My Friends</ThemedText>
                
                {friends?.map((f: Friend) => (
                    <ThemedText key={f._id.toString()}>{f.name}</ThemedText>
                ))}

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
                
                {/* Loading state */}
                {results === undefined ? (
                    <ThemedText>Loading...</ThemedText>
                ) : results.length === 0 && query.length > 0 ? (
                    <ThemedText>No users found.</ThemedText>
                ) : (
                    <FlatList
                        data={results ?? []}
                        keyExtractor={(item) => item._id.toString()}
                        renderItem={({ item }) => (
                            <ThemedView 
                                style={{
                                    flexDirection: "row", 
                                    justifyContent: "space-between", 
                                    paddingVertical: 12, 
                                    borderBottomWidth: 0.5, 
                                    borderBottomColor: borderColor,
                                }}
                            >
                                <ThemedText>{item.username ??
                                            (
                                                `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() ||
                                                "Unknown"
                                            )}
                                </ThemedText>
                                
                                {/* Add Friend Button */}
                                <TouchableOpacity 
                                    disabled={pending.includes(item._id)}
                                    onPress={() => handleSend(item)}
                                    style={{
                                        backgroundColor: pending.includes(item._id)
                                            ? "#999"
                                            : "#007AFF",
                                        paddingHorizontal: 12, 
                                        paddingVertical: 6,
                                        borderRadius: 8,
                                    }}
                                >
                                    <ThemedText style={{ color: "white" }}>
                                        {pending.includes(item._id)
                                        ? "Requested"
                                        : "Add Friend"}
                                    </ThemedText>
                                </TouchableOpacity>
                            </ThemedView>
                        )}
                    />
                )}
            </ThemedView>
        </SafeAreaView>
    );
}

