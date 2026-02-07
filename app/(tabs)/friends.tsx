// Name: Bryan Estrada-Cordoba

import { View, Text, TextInput, FlatList, TouchableOpacity } from "react-native";
import { useState } from "react";

type User = {
    id: string;
    username: string;
};

export default function FriendScreen() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<User[]>([]);

    // Temp Mock Data
    const mockUsers: User[] = [
        { id: "1", username: "Bryan" },
        { id: "2", username: "Jabcobo"},
        { id: "3", username: "Luke"},
        { id: "4", username: "Berit"},
        { id: "5", username: "Anthony"},
    ];

    const handleSearch = (text: string) => {
        setQuery(text);

        if (text.trim() === "") {
            setResults([]);
            return;
        }

        const filtered = mockUsers.filter((user) => 
            user.username.toLowerCase().includes(text.toLowerCase())
        );

        setResults(filtered);
    };

    // Placeholder
    const sendFriendRequest = (user: User) => {
        console.log("Friend request set to:", user.username);
        // Furture Devlopment with Convex
    };

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>
                Friends
            </Text>

            {/* Search Bar */}
            <TextInput 
                placeholder="Search by username or email..."
                value={query}
                onChangeText={handleSearch}
                style={{
                    borderWidth: 1, 
                    borderRadius: 10, 
                    padding: 10, 
                    marginBottom: 15, 
                }}
            />
             
            {results.length === 0 && query.length > 0 ? (
                <Text>No users found.</Text>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View 
                            style={{
                                flexDirection: "row", 
                                justifyContent: "space-between", 
                                paddingVertical: 12, 
                                borderBottomWidth: 0.5
                            }}
                        >
                            <Text>{item.username}</Text>
                            
                            {/* Add Friend Button */}
                            <TouchableOpacity 
                                onPress={() => sendFriendRequest(item)}
                                style={{
                                    backgroundColor: "#007AFF",
                                    paddingVertical: 6, 
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ color: "white" }}>Add Friend</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

