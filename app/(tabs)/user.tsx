import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import ImageViewing from "react-native-image-viewing";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  checkGeofencingPermissions,
  requestAllGeofencingPermissions,
  type GeofencingPermissions,
} from "@/lib/permissions";

import ProfileImage from "@/components/ProfileImage";
import { api } from "../../convex/_generated/api";

const { width } = Dimensions.get("window");

export default function UserScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const backgroundColor = isDark ? "#121212" : "#fff";
  const textColor = isDark ? "#fff" : "#000";
  const subTextColor = isDark ? "#aaa" : "#666";

  const user = useQuery(api.users.getCurrentUser);
  const overview = useQuery(api.achievements.getOverview);
  const pins = useQuery(api.pins.getPinsWithUrls);

  const friends = useQuery(api.friends.listFriends, {
    userId: user?._id,
  });

  const profilePictureUrl = useQuery(
    api.users.getProfilePictureUrl,
    user?.profilePicture ? { storageId: user.profilePicture } : "skip"
  );

  const updateProfile = useMutation(api.users.updateProfile);
  const { signOut } = useAuthActions();
  const [perms, setPerms] = useState<GeofencingPermissions | null>(null);
  const [hideAlertsPrompt, setHideAlertsPrompt] = useState(false);

  useEffect(() => {
    checkGeofencingPermissions().then(setPerms);
  }, []);

  const allGranted =
    perms?.foregroundLocation && perms?.backgroundLocation && perms?.notifications;

  const handleEnableAlerts = async () => {
    setHideAlertsPrompt(true);
    const result = await requestAllGeofencingPermissions();
    setPerms(result);

    // If background location was denied, the user likely needs to go to Settings
    if (!result.backgroundLocation && result.foregroundLocation) {
      Linking.openSettings();
    }
  };

  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [menuVisible, setMenuVisible] = useState(false);
  const [bio, setBio] = useState("");

  const [selectedPin, setSelectedPin] = useState<any | null>(null);

  // carousel state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);

  const selectedPinPictures = useQuery(
    api.pins.getPinPictures,
    selectedPin ? { pinId: selectedPin._id } : "skip"
  );

  const selectedPinTags = useQuery(
    api.pinTags.getTagsForPin,
    selectedPin ? { pinId: selectedPin._id } : "skip"
  );

  const imageUrls = useMemo(() => {
    return (
      selectedPinPictures?.map((p: any) => ({
        uri: p.url,
      })) || []
    );
  }, [selectedPinPictures]);

  if (!user) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: textColor }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const isPosts = activeTab === "posts";
  const backgroundColor = isDark ? "#121212" : "#fff";
  const textColor = isDark ? "#fff" : "#000";
  const subTextColor = isDark ? "#aaa" : "#666";
  const cardColor = isDark ? "#1d1d1d" : "#f5f7fb";

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
            <Text style={{ fontSize: 22, color: textColor }}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* PROFILE */}
        <View style={{ flexDirection: "row", marginTop: 15 }}>
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
            isDark={isDark}
          />

          <Stat
            label="Badges"
            value={overview?.earnedBadges?.length || 0}
            isDark={isDark}
          />

          <Stat
            label="Friends"
            value={friends?.length || 0}
            isDark={isDark}
          />
        </View>

        {!allGranted && !hideAlertsPrompt && (
          <TouchableOpacity
            onPress={handleEnableAlerts}
            activeOpacity={0.75}
            style={{
              marginTop: 16,
              backgroundColor: "#e01b24",
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
              Enable Nearby Pin Alerts
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 }}>
              {!perms?.foregroundLocation
                ? "Allow location and notifications to get alerts near your saved pins."
                : !perms?.backgroundLocation
                  ? "Requires 'Always Allow' location access to keep working in the background."
                  : "Tap to finish enabling notification access."}
            </Text>
          </TouchableOpacity>
        )}

        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => router.push("/timeline")}
            style={{
              flex: 1,
              backgroundColor: cardColor,
              paddingHorizontal: 12,
              paddingVertical: 11,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: textColor, fontWeight: "600" }}>View Timeline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={{
              flex: 1,
              backgroundColor: cardColor,
              paddingHorizontal: 12,
              paddingVertical: 11,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: textColor, fontWeight: "600" }}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View style={{ flexDirection: "row", marginTop: 20 }}>
          <Tab
            label="Posts"
            active={isPosts}
            isDark={isDark}
            onPress={() => setActiveTab("posts")}
          />

          <Tab
            label="Achievements"
            active={!isPosts}
            isDark={isDark}
            onPress={() => setActiveTab("achievements")}
          />
        </View>
      </View>

      {/* GRID */}
      <FlatList
        key={isPosts ? "grid" : "list"}
        data={isPosts ? pins || [] : overview?.earnedBadges || []}
        numColumns={isPosts ? 3 : 1}
        keyExtractor={(i: any) => i._id.toString()}
        renderItem={({ item }: any) =>
          isPosts ? (
            <TouchableOpacity
              style={{
                width: "33.33%",
                aspectRatio: 1,
                padding: 1,
              }}
              onPress={() => {
                setSelectedPin(item);
                setActiveImageIndex(0);
              }}
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
          ) : (
            <View style={{ padding: 10 }}>
              <Text style={{ color: textColor }}>
                {item.badgeKey}
              </Text>
            </View>
          )
        }
      />

      {/* POST MODAL */}
      <Modal visible={!!selectedPin} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor }}>
          {/* CLOSE */}
          <TouchableOpacity
            onPress={() => setSelectedPin(null)}
            style={{ padding: 15 }}
          >
            <Text style={{ color: textColor }}>Close</Text>
          </TouchableOpacity>

          {/* IMAGE CAROUSEL */}
          {selectedPinPictures?.length > 0 && (
            <View>
              <FlatList
                data={selectedPinPictures}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.storageId}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(
                    e.nativeEvent.contentOffset.x / width
                  );
                  setActiveImageIndex(index);
                }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setZoomVisible(true)}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={{
                        width,
                        height: 400,
                      }}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                )}
              />

              {/* DOTS */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 8,
                }}
              >
                {selectedPinPictures.map((_: any, i: number) => (
                  <View
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      margin: 3,
                      backgroundColor:
                        i === activeImageIndex
                          ? isDark
                            ? "#fff"
                            : "#000"
                          : isDark
                          ? "#777"
                          : "#ccc",
                    }}
                  />
                ))}
              </View>
            </View>
          )}

          {/* DETAILS */}
          <View style={{ padding: 16 }}>
            <Text
              style={{
                color: textColor,
                fontSize: 24,
                fontWeight: "700",
              }}
            >
              {selectedPin?.title}
            </Text>

            {selectedPin?.description && (
              <Text
                style={{
                  color: subTextColor,
                  marginTop: 10,
                }}
              >
                {selectedPin.description}
              </Text>
            )}

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
                    backgroundColor: tag.color || "#3b82f6",
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 20,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: "#fff" }}>
                    #{tag.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ZOOM VIEW */}
      <ImageViewing
        images={imageUrls}
        imageIndex={activeImageIndex}
        visible={zoomVisible}
        onRequestClose={() => setZoomVisible(false)}
      />

      {/* MENU */}
      <Modal transparent visible={menuVisible}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
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
            <TouchableOpacity onPress={() => router.push("/timeline")}>
              <Text style={{ color: textColor }}>
                View Timeline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/settings")}>
              <Text
                style={{
                  color: textColor,
                  marginTop: 10,
                }}
              >
                Settings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={signOut}>
              <Text
                style={{
                  color: "red",
                  marginTop: 10,
                }}
              >
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

function Stat({ label, value, isDark }: any) {
  const textColor = isDark ? "#fff" : "#000";
  const subTextColor = isDark ? "#aaa" : "#666";

  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{
          fontWeight: "700",
          color: textColor,
        }}
      >
        {value}
      </Text>

      <Text style={{ color: subTextColor }}>
        {label}
      </Text>
    </View>
  );
}

function Tab({ label, active, onPress, isDark }: any) {
  const textColor = isDark ? "#fff" : "#000";
  const inactiveColor = isDark ? "#888" : "#777";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingBottom: 10,
        borderBottomWidth: active ? 2 : 0,
        borderBottomColor: active
          ? textColor
          : "transparent",
      }}
    >
      <Text
        style={{
          textAlign: "center",
          fontWeight: active ? "700" : "400",
          color: active ? textColor : inactiveColor,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
