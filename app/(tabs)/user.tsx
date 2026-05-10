import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import ProfileImage from "@/components/ProfileImage";
import { api } from "../../convex/_generated/api";

export default function UserScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const user = useQuery(api.users.getCurrentUser);
  const overview = useQuery(api.achievements.getOverview);
  const pins = useQuery(api.pins.getPinsWithUrls);

  const friends = useQuery(api.friends.listFriends, {
    userId: user?._id,
  });

  const profilePictureUrl = useQuery(
    api.users.getProfilePictureUrl,
    user?.profilePicture
      ? { storageId: user.profilePicture }
      : "skip"
  );

  const updateProfile = useMutation(api.users.updateProfile);

  const { signOut } = useAuthActions();

  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [menuVisible, setMenuVisible] = useState(false);
  const [bio, setBio] = useState("");

  // POST VIEWER
  const [selectedPin, setSelectedPin] = useState<any | null>(null);

  const selectedPinPictures = useQuery(
    api.pins.getPinPictures,
    selectedPin
      ? { pinId: selectedPin._id }
      : "skip"
  );

  const selectedPinTags = useQuery(
    api.pinTags.getTagsForPin,
    selectedPin
      ? { pinId: selectedPin._id }
      : "skip"
  );

  if (!user) return <Text>Loading...</Text>;

  const handleEdit = () => {
    setBio(user.bio || "");
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateProfile({ bio });

      setEditing(false);

      Alert.alert("Profile updated!");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const backgroundColor = isDark ? "#121212" : "#fff";
  const textColor = isDark ? "#fff" : "#000";
  const subTextColor = isDark ? "#aaa" : "#666";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <View style={{ padding: 16 }}>

        {/* TOP BAR */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: textColor,
            }}
          >
            {user.username}
          </Text>

          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Text style={{ fontSize: 22, color: textColor }}>
              ⋯
            </Text>
          </TouchableOpacity>
        </View>

        {/* PROFILE */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 15,
          }}
        >
          <ProfileImage
            uri={profilePictureUrl}
            size={90}
            editable={editing}
          />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: textColor,
              }}
            >
              {user.firstName || ""} {user.lastName || ""}
            </Text>

            <Text style={{ color: subTextColor }}>
              {user.bio || "No bio yet"}
            </Text>
          </View>
        </View>

        {/* STATS */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 12,
            justifyContent: "space-around",
          }}
        >
          <Stat
            label="Pins"
            value={pins?.length || 0}
          />

          <Stat
            label="Badges"
            value={overview?.earnedBadges?.length || 0}
          />

          <Stat
            label="Friends"
            value={friends?.length || 0}
          />
        </View>

        {/* EDIT */}
        {!editing ? (
          <TouchableOpacity
            onPress={handleEdit}
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: textColor }}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor={subTextColor}
              style={{
                borderWidth: 1,
                marginTop: 10,
                padding: 6,
                color: textColor,
              }}
            />

            <TouchableOpacity onPress={handleSave}>
              <Text
                style={{
                  color: "green",
                  marginTop: 10,
                }}
              >
                Save
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* TABS */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 20,
          }}
        >
          <Tab
            label="Posts"
            active={activeTab === "posts"}
            onPress={() => setActiveTab("posts")}
          />

          <Tab
            label="Achievements"
            active={activeTab === "achievements"}
            onPress={() => setActiveTab("achievements")}
          />
        </View>
      </View>

      {/* POSTS */}
      {activeTab === "posts" ? (
        <FlatList
          key="posts"
          data={pins || []}
          numColumns={3}
          keyExtractor={(i) => i._id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                width: "33.33%",
                aspectRatio: 1,
                padding: 1,
              }}
              onPress={() => setSelectedPin(item)}
            >
              <Animated.Image
                source={{
                  uri:
                    item.picturesUrls?.[0]?.url ||
                    item.thumbnail ||
                    "https://via.placeholder.com/150",
                }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          key="achievements"
          data={overview?.earnedBadges || []}
          keyExtractor={(i) => i._id.toString()}
          renderItem={({ item }) => (
            <View style={{ padding: 10 }}>
              <Text style={{ color: textColor }}>
                {item.badgeKey}
              </Text>
            </View>
          )}
        />
      )}

      {/* INSTAGRAM STYLE POST VIEWER */}
      <Modal
        visible={!!selectedPin}
        animationType="slide"
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor,
          }}
        >
          <ScrollView>

            {/* CLOSE */}
            <TouchableOpacity
              onPress={() => setSelectedPin(null)}
              style={{
                padding: 15,
              }}
            >
              <Text
                style={{
                  color: textColor,
                  fontSize: 16,
                }}
              >
                Close
              </Text>
            </TouchableOpacity>

            {/* PHOTOS */}
            {selectedPinPictures?.map((picture: any) => (
              <View key={picture.storageId}>
                <Image
                  source={{ uri: picture.url }}
                  style={{
                    width: "100%",
                    height: 400,
                  }}
                  contentFit="cover"
                />

                {picture.caption ? (
                  <Text
                    style={{
                      color: textColor,
                      padding: 12,
                      fontSize: 15,
                    }}
                  >
                    {picture.caption}
                  </Text>
                ) : null}
              </View>
            ))}

            <View style={{ padding: 16 }}>

              {/* TITLE */}
              <Text
                style={{
                  color: textColor,
                  fontSize: 24,
                  fontWeight: "700",
                }}
              >
                {selectedPin?.title}
              </Text>

              {/* DESCRIPTION */}
              {selectedPin?.description ? (
                <Text
                  style={{
                    color: subTextColor,
                    marginTop: 10,
                    lineHeight: 22,
                  }}
                >
                  {selectedPin.description}
                </Text>
              ) : null}

              {/* ADDRESS */}
              {selectedPin?.address ? (
                <Text
                  style={{
                    color: subTextColor,
                    marginTop: 10,
                  }}
                >
                  📍 {selectedPin.address}
                </Text>
              ) : null}

              {/* TAGS */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginTop: 18,
                }}
              >
                {selectedPinTags?.map((tag: any) => (
                  <View
                    key={tag._id}
                    style={{
                      backgroundColor:
                        tag.color || "#3b82f6",
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "600",
                      }}
                    >
                      #{tag.name}
                    </Text>
                  </View>
                ))}
              </View>

              {/* DATE */}
              <Text
                style={{
                  color: subTextColor,
                  marginTop: 18,
                  fontSize: 13,
                }}
              >
                {selectedPin?.createdAt
                  ? new Date(
                      selectedPin.createdAt
                    ).toLocaleDateString()
                  : ""}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MENU */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="slide"
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor:
              "rgba(0,0,0,0.3)",
            justifyContent: "flex-end",
          }}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={{
              backgroundColor,
              padding: 20,
            }}
          >
            <TouchableOpacity
              onPress={() =>
                router.push("/timeline")
              }
            >
              <Text
                style={{
                  color: textColor,
                  marginBottom: 10,
                }}
              >
                View Timeline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push("/settings")
              }
            >
              <Text
                style={{
                  color: textColor,
                  marginBottom: 10,
                }}
              >
                Settings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={signOut}>
              <Text style={{ color: "red" }}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* COMPONENTS */

function Stat({ label, value }: any) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontWeight: "700" }}>
        {value}
      </Text>

      <Text>{label}</Text>
    </View>
  );
}

function Tab({ label, active, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1 }}
    >
      <Text
        style={{
          textAlign: "center",
          fontWeight: active ? "700" : "400",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
