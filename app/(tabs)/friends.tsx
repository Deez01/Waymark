// Name: Bryan Estrada-Cordoba

import { View, Text, TextInput, FlatList, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export default function FriendScreen() {
    const [query, setQuery] = useState("");
    const currentUserId = "demoUserId";

    const results = useQuery(api.friends.searchUsers, {
        search: query, 
        currentUserId,
    });
    type ResultUser = NonNullable<typeof results>[number];

    // Mutation
    const sendFriendRequest = useMutation(api.friends.sendFriendRequest);

    // Loading pending UI state
    const [pending, setPending] = useState<Id<"users">[]>([]);

    const handleSend = async (user: ResultUser) => {

        if (pending.includes(user._id)) return;

        setPending((prev) => [...prev, user._id]);

        await sendFriendRequest({
            senderId: currentUserId,
            receiverId: user._id,
        });
    };

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>
                Friends
            </Text>

            {/* Search Bar */}
            <TextInput 
                placeholder="Search users..."
                value={query}
                onChangeText={setQuery}
                style={{
                    borderWidth: 1, 
                    borderRadius: 10, 
                    padding: 10, 
                    marginBottom: 15, 
                }}
            />
            
            {/* Loading state */}
            {results === undefined ? (
                <Text>Loading...</Text>
            ) : results.length === 0 && query.length > 0 ? (
                <Text>No users found.</Text>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <View 
                            style={{
                                flexDirection: "row", 
                                justifyContent: "space-between", 
                                paddingVertical: 12, 
                                borderBottomWidth: 0.5
                            }}
                        >
                            <Text>{item.name}</Text>
                            
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
                                <Text style={{ color: "white" }}>
                                    {pending.includes(item._id)
                                    ? "Requested"
                                    : "Add Friend"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

