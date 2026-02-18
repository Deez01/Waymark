// Name: Bryan Estrada-Cordoba

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { FlatList, TextInput, TouchableOpacity } from "react-native";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export default function FriendScreen() {
    const inputBackground = useThemeColor({}, "background");
    const textColor = useThemeColor({}, "text");
    const borderColor = useThemeColor({}, "icon")

    const [query, setQuery] = useState("");
    const currentUserId = "demoUserId";

    const results = useQuery(api.friends.searchUsers, {
        search: query, 
        currentUserId,
    });

    type ResultUser = NonNullable<
        ReturnType<typeof useQuery<typeof api.friends.searchUsers>>
    >[number];

    const incoming = useQuery(api.friends.getIncomingRequests, {
        userId: currentUserId,
    });

    const respondToRequest = useMutation(api.friends.respondToRequest);

    const friends = useQuery(api.friends.listFriends, {
        userId: currentUserId,
    });

    // Mutation
    const sendFriendRequest = useMutation(api.friends.sendFriendRequest);

    // Loading pending UI state
    const [pending, setPending] = useState<Id<"users">[]>([]);

    const handleSend = async (user: ResultUser) => {

        if (pending.includes(user._id)) return;

        setPending((prev) => [...prev, user._id]);

        await sendFriendRequest({
            senderId: currentUserId,
            receiverId: user.auth0Id,
        });
    };

    return (
        <ThemedView style={{ flex: 1, padding: 16 }}>
            <ThemedText type="title" style={{marginBottom: 10 }}>
                Friends
            </ThemedText>
            
            {/* Incoming Friend Requests */}
            <ThemedText type="subtitle" style={{ marginTop: 10 }}>Incoming Request </ThemedText>

            {incoming?.map((req) => (
                <ThemedView   
                    key={req._id}
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
                                requestId: req._id,
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
                                requestId: req._id,
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
            
            {friends?.map((f) => (
                <ThemedText key={f._id}>{f.name}</ThemedText>
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
                    data={results}
                    keyExtractor={(item) => item._id}
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
                            <ThemedText>{item.name}</ThemedText>
                            
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
    );
}

