// Name: Bryan Estrada-Cordoba 

import { ThemedText } from "@/components/themed-text";
import { useMutation, useQuery } from "convex/react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Button, Modal, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, View } from "react-native";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export default function EditCaptionScreen() {
  const { pinId, currentCaption } = useLocalSearchParams();

  const typePinId = pinId as Id<"pins">;

  const [caption, setCaption] = useState(
    typeof currentCaption === "string" ? currentCaption : ""
  );
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [showTagModal, setShowTagModal] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Preset colors for quick selection
  const presetColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

  const updateCaption = useMutation(api.pins.updateCaption);
  const allTags = useQuery(api.pinTags.getAllTags);
  const pinTags = useQuery(api.pinTags.getTagsForPin, { pinId: typePinId });
  const addTagToPin = useMutation(api.pinTags.addTagToPin);
  const removeTagFromPin = useMutation(api.pinTags.removeTagFromPin);
  const createTag = useMutation(api.pinTags.createTag);
  const deleteTag = useMutation(api.pinTags.deleteTag);
  const allCategories = useQuery(api.pinTags.getAllCategories);

  const pinTagIds = pinTags?.map((t) => t._id) || [];

  // Group tags by category
  const tagsByCategory = allTags ? allTags.reduce((acc: Record<string, typeof allTags>, tag) => {
    const category = tag.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {}) : {};

  const handleSave = async () => {
    try {
      await updateCaption({
        pinId: typePinId,
        caption,
      });
      Alert.alert("Success", "Caption updated");
      router.back();
    } catch (err: any) {
      const message =
        err?.message ?? "Failed to save caption. Please try again.";

      Alert.alert("Error", message);
    }
  };

  const handleAddTag = async (tagId: Id<"tags">) => {
    try {
      await addTagToPin({ pinId: typePinId, tagId });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagId: Id<"tags">) => {
    try {
      await removeTagFromPin({ pinId: typePinId, tagId });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to remove tag");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert("Error", "Tag name cannot be empty");
      return;
    }

    try {
      const newTagId = await createTag({ name: newTagName, color: selectedColor });
      await addTagToPin({ pinId: typePinId, tagId: newTagId });
      setNewTagName("");
      setSelectedColor("#3b82f6");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create tag");
    }
  };

  const handleLongPressTag = (tag: any) => {
    if (!tag.isDefault) {
      Alert.alert(
        "Delete Tag",
        `Are you sure you want to delete "${tag.name}"? This tag will be removed from all pins.`,
        [
          { text: "Cancel", onPress: () => { }, style: "cancel" },
          {
            text: "Delete",
            onPress: async () => {
              try {
                await deleteTag({ tagId: tag._id });
                Alert.alert("Success", "Tag deleted");
              } catch (err: any) {
                Alert.alert("Error", err?.message ?? "Failed to delete tag");
              }
            },
            style: "destructive",
          },
        ]
      );
    } else {
      Alert.alert("Info", "Default tags cannot be deleted");
    }
  };

<<<<<<< HEAD
  return (
=======
    return (
      <>
      <Stack.Screen
        options={{
          title: "Edit Caption",
        }}
      />
>>>>>>> origin/main
    <ScrollView style={{ padding: 16, backgroundColor: isDark ? "#000" : "#fff", flex: 1 }}>
      <ThemedText style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>Caption</ThemedText>
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Edit caption..."
        placeholderTextColor={isDark ? "#888" : "#666"}
        maxLength={400}
        multiline
        style={{
          borderWidth: 1,
          borderColor: isDark ? "#444" : "#ccc",
          padding: 10,
          borderRadius: 6,
          minHeight: 80,
          backgroundColor: isDark ? "#111" : "#fff",
          color: isDark ? "#fff" : "#000",
          marginBottom: 12,
        }}
      />
      <ThemedText
        style={{
          textAlign: "right",
          color: caption.length > 400 ? "red" : "gray",
          marginBottom: 12,
        }}
      >
        {caption.length}/400
      </ThemedText>

      {/* Tags Section */}
      <ThemedText style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, marginTop: 12 }}>Tags</ThemedText>

      {/* Display current tags */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12, gap: 8 }}>
        {pinTags && pinTags.length > 0 ? (
          pinTags.map((tag) => (
            <TouchableOpacity
              key={tag._id}
              onPress={() => handleRemoveTag(tag._id)}
              style={{
                backgroundColor: tag.color || "#3b82f6",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>
                {tag.name} ✕
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <ThemedText style={{ color: isDark ? "#888" : "#666" }}>No tags yet</ThemedText>
        )}
      </View>

      {/* Add Tags Button */}
      <Button
        title="Add Tags"
        onPress={() => setShowTagModal(true)}
      />

      <Button
        title="Save Caption"
        onPress={handleSave}
        disabled={caption.length > 400}
      />

      {/* Bottom Sheet Modal for Tag Selection */}
      <Modal
        visible={showTagModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTagModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <View
            style={{
              flex: 1,
              marginTop: "auto",
              backgroundColor: isDark ? "#1a1a1a" : "#fff",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "85%",
            }}
          >
            {/* Header */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? "#333" : "#e5e7eb",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ThemedText style={{ fontSize: 18, fontWeight: "600" }}>Add Tags</ThemedText>
              <TouchableOpacity onPress={() => setShowTagModal(false)}>
                <Text style={{ fontSize: 24, color: isDark ? "#fff" : "#000" }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView style={{ padding: 16 }}>
              {/* Category Sections */}
              {Object.entries(tagsByCategory).map(([category, tags]) => (
                <View key={category} style={{ marginBottom: 20 }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: "600", marginBottom: 10 }}>
                    {category}
                  </ThemedText>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {tags && tags.map((tag) => {
                      const isSelected = pinTagIds.includes(tag._id);
                      return (
                        <TouchableOpacity
                          key={tag._id}
                          onPress={() => {
                            if (isSelected) {
                              handleRemoveTag(tag._id);
                            } else {
                              handleAddTag(tag._id);
                            }
                          }}
                          onLongPress={() => handleLongPressTag(tag)}
                          delayLongPress={500}
                          style={{
                            backgroundColor: isSelected ? (tag.color || "#3b82f6") : (tag.color || "#e5e7eb"),
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 16,
                            borderWidth: isSelected ? 0 : 1,
                            borderColor: isDark ? "#444" : "#ccc",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "500",
                              color: isSelected ? "#fff" : (isDark ? "#fff" : "#000"),
                            }}
                          >
                            {tag.name}{isSelected ? " ✓" : ""}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* Create New Tag Section */}
              <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? "#333" : "#e5e7eb" }}>
                <ThemedText style={{ fontSize: 14, fontWeight: "600", marginBottom: 10 }}>Create New Tag</ThemedText>
                <TextInput
                  value={newTagName}
                  onChangeText={setNewTagName}
                  placeholder="Tag name..."
                  placeholderTextColor={isDark ? "#888" : "#666"}
                  style={{
                    borderWidth: 1,
                    borderColor: isDark ? "#444" : "#ccc",
                    padding: 10,
                    borderRadius: 6,
                    backgroundColor: isDark ? "#111" : "#fff",
                    color: isDark ? "#fff" : "#000",
                    marginBottom: 12,
                  }}
                />

                {/* Color Picker */}
                <ThemedText style={{ fontSize: 12, color: isDark ? "#aaa" : "#666", marginBottom: 8 }}>
                  Choose a color:
                </ThemedText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"].map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: color,
                        borderWidth: selectedColor === color ? 3 : 0,
                        borderColor: "#fff",
                      }}
                    />
                  ))}
                </View>

                <Button title="Create Tag" onPress={handleCreateTag} />
              </View>
            </ScrollView>

            {/* Footer Button */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: isDark ? "#333" : "#e5e7eb" }}>
              <Button title="Done" onPress={() => setShowTagModal(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </>
  );
}
