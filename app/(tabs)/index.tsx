// app/(tabs)/index.tsx
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { LongPressEvent, Marker } from "react-native-maps";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddPinSheet from "@/components/AddPinSheet";
import ViewEditPinSheet from "@/components/ViewEditPinSheet";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function MapScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const adwaitaBlue = '#62a0ea';
  const adwaitaRed = '#e01b24'; // Added Adwaita Red for the pins

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number | undefined>();
  const [selectedLng, setSelectedLng] = useState<number | undefined>();
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Id<"tags">[]>([]);

  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [viewPinTrigger, setViewPinTrigger] = useState(0);

  const [minimizeTrigger, setMinimizeTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state that drives the backend query for map pins.
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [fromMonth, setFromMonth] = useState<number | null>(null);
  const [fromDay, setFromDay] = useState<number | null>(null);
  const [fromYear, setFromYear] = useState<number | null>(null);
  const [toMonth, setToMonth] = useState<number | null>(null);
  const [toDay, setToDay] = useState<number | null>(null);
  const [toYear, setToYear] = useState<number | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState<{
    range: "from" | "to";
    part: "month" | "day" | "year";
  } | null>(null);
  const allTags = useQuery(api.pinTags.getAllTags);

  const currentYear = new Date().getFullYear();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const yearOptions = Array.from({ length: currentYear - 1979 }, (_, i) => currentYear - i);

  const getDaysInMonth = (year: number | null, month: number | null) => {
    if (!year || !month) return 31;
    return new Date(year, month, 0).getDate();
  };

  const fromDayLimit = getDaysInMonth(fromYear, fromMonth);
  const toDayLimit = getDaysInMonth(toYear, toMonth);

  const toIsoDate = (year: number | null, month: number | null, day: number | null) => {
    if (!year || !month || !day) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // Only complete month/day/year selections become date filters.
  const startDate = toIsoDate(fromYear, fromMonth, fromDay);
  const endDate = toIsoDate(toYear, toMonth, toDay);

  // Multi-select tags with OR behavior (any selected tag can match).
  const toggleTagSelection = (tagId: Id<"tags">) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Main filtered data source for markers on the map.
  const pins = useQuery(api.pins.searchAndFilterMyPins, {
    searchText: filterText.trim() || undefined,
    locationQuery: locationQuery.trim() || undefined,
    startDate: startDate.trim() || undefined,
    endDate: endDate.trim() || undefined,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
  });

  const tagsByCategory = allTags
    ? allTags.reduce((acc: Record<string, any[]>, tag: any) => {
        const category = tag.category || "Other";
        if (!acc[category]) acc[category] = [];
        acc[category].push(tag);
        return acc;
      }, {})
    : {};

  // Used for the red badge count shown on the Filter button.
  const activeFiltersCount = [
    filterText.trim().length > 0,
    locationQuery.trim().length > 0,
    !!startDate,
    !!endDate,
    selectedTagIds.length > 0,
  ].filter(Boolean).length;

  useEffect(() => {
    // If month/year changes, clamp selected day to a valid day for that month.
    if (fromDay && fromDay > fromDayLimit) {
      setFromDay(fromDayLimit);
    }
  }, [fromDay, fromDayLimit]);

  useEffect(() => {
    // Same clamp behavior for the upper-bound date picker.
    if (toDay && toDay > toDayLimit) {
      setToDay(toDayLimit);
    }
  }, [toDay, toDayLimit]);

  // Builds the currently open dropdown options (month/day/year).
  const getPickerOptions = () => {
    if (!openDatePicker) return [] as { value: number; label: string }[];

    if (openDatePicker.part === "month") {
      return monthNames.map((name, index) => ({ value: index + 1, label: name }));
    }

    if (openDatePicker.part === "year") {
      return yearOptions.map((year) => ({ value: year, label: String(year) }));
    }

    const dayLimit = openDatePicker.range === "from" ? fromDayLimit : toDayLimit;
    return Array.from({ length: dayLimit }, (_, index) => {
      const day = index + 1;
      return { value: day, label: String(day) };
    });
  };

  const pickerOptions = getPickerOptions();

  const openPartPicker = (range: "from" | "to", part: "month" | "day" | "year") => {
    // Tapping an already-open picker closes it (toggle UX).
    setOpenDatePicker((prev) => {
      if (prev && prev.range === range && prev.part === part) {
        return null;
      }
      return { range, part };
    });
  };

  // Applies the picked value to the correct field, then closes the dropdown.
  const handleSelectDatePart = (value: number) => {
    if (!openDatePicker) return;

    if (openDatePicker.range === "from") {
      if (openDatePicker.part === "month") setFromMonth(value);
      if (openDatePicker.part === "day") setFromDay(value);
      if (openDatePicker.part === "year") setFromYear(value);
    } else {
      if (openDatePicker.part === "month") setToMonth(value);
      if (openDatePicker.part === "day") setToDay(value);
      if (openDatePicker.part === "year") setToYear(value);
    }

    setOpenDatePicker(null);
  };

  const dateDisplayText = (part: "month" | "day" | "year", value: number | null) => {
    // Placeholder labels keep the segmented date UI readable before selection.
    if (!value) {
      if (part === "month") return "Month";
      if (part === "day") return "Day";
      return "Year";
    }

    if (part === "month") return monthNames[value - 1];
    return String(value);
  };

  useEffect(() => {
    const openSheetParam = Array.isArray(params.openSheet)
      ? params.openSheet[0]
      : params.openSheet;

    if (openSheetParam === 'true') {
      setSelectedLat(undefined);
      setSelectedLng(undefined);
      setSelectedTagIds([]);
      setSelectedAddress(undefined);

      setIsSheetOpen(true);
      setIsViewSheetOpen(false);
      setSelectedPin(null);
      router.setParams({ openSheet: '' });
    }
  }, [params.openSheet]);

  const handleLongPress = (e: LongPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLat(latitude);
    setSelectedLng(longitude);
    setSelectedTitle(undefined);
    setSelectedAddress(undefined);

    setIsSheetOpen(true);
    setIsViewSheetOpen(false);
    setSelectedPin(null);
  };

  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setPredictions([]);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&accept-language=es,en&lat=33.783&lon=-118.114`, {
        headers: { 'User-Agent': 'WaymarkApp/1.0' }
      });
      if (!response.ok) return;
      const textResponse = await response.text();
      const data = JSON.parse(textResponse);
      setPredictions(data);
    } catch (e) {
      console.log("Autocomplete error safely caught:", e);
    }
  };

  const handleSelectPlace = (place: any) => {
    const mainText = place.name || place.display_name.split(',')[0];
    setSelectedTitle(mainText);
    setSelectedAddress(place.display_name);
    setSelectedLat(parseFloat(place.lat));
    setSelectedLng(parseFloat(place.lon));
    setSearchQuery('');
    setPredictions([]);
    Keyboard.dismiss();

    setIsSheetOpen(true);
    setIsViewSheetOpen(false);
    setSelectedPin(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider="google"
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 33.783,
          longitude: -118.114,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={colorScheme === 'dark' ? darkMapStyle : lightMapStyle}

        showsUserLocation={true}
        showsMyLocationButton={true}
        mapPadding={{
          top: 100,
          right: 10,
          bottom: 35,
          left: 10
        }}
        onLongPress={handleLongPress}
        onPress={() => Keyboard.dismiss()}
        onPanDrag={() => {
          if (isSheetOpen || isViewSheetOpen) {
            setMinimizeTrigger(prev => prev + 1);
          }
        }}
      >
        {pins?.map((pin: any) => (
          <Marker
            key={pin._id}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            title={pin.title}
            // Pins set to Adwaita Red for better visibility
            pinColor={adwaitaRed}
            onPress={(e) => {
              e.stopPropagation(); // Prevent the map's onPress from firing
              setSelectedPin(pin);
              setIsViewSheetOpen(true);
              setViewPinTrigger(prev => prev + 1);
              setIsSheetOpen(false);
            }}
            onCalloutPress={() => {
              router.push({
                pathname: "/edit-caption",
                params: { pinId: pin._id, currentCaption: pin.caption },
              });
            }}
          />
        ))}
      </MapView>

      <View style={[styles.searchOverlay, { top: insets.top + 10 }]}>
        <View style={[
          styles.searchContainer,
          {
            backgroundColor: theme.background,
            shadowColor: colorScheme === 'dark' ? '#000' : '#888'
          }
        ]}>
          <MaterialIcons name="search" size={24} color={adwaitaBlue} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search for a place..."
            placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); }}>
              <MaterialIcons name="close" size={20} color={adwaitaBlue} />
            </TouchableOpacity>
          )}
        </View>

        {predictions.length > 0 && (
          <View style={[styles.predictionsContainer, { backgroundColor: theme.background }]}>
            {predictions.map((p, index) => (
              <TouchableOpacity
                key={p.place_id || index}
                style={[styles.predictionItem, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' }]}
                onPress={() => handleSelectPlace(p)}
              >
                <Text style={[styles.predictionMainText, { color: theme.text }]} numberOfLines={1}>
                  {p.name || p.display_name.split(',')[0]}
                </Text>
                <Text style={[styles.predictionSubText, { color: colorScheme === 'dark' ? '#77767b' : '#9a9996' }]} numberOfLines={1}>
                  {p.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.filterFab,
          {
            top: insets.top + 72,
            backgroundColor: theme.background,
            borderColor: colorScheme === "dark" ? "#333" : "#ddd",
          },
        ]}
        onPress={() => setIsFilterModalOpen(true)}
      >
        {/* Badge reflects how many filter groups are currently active. */}
        <MaterialIcons name="tune" size={18} color={adwaitaBlue} />
        <Text style={[styles.filterFabText, { color: theme.text }]}>Filter</Text>
        {activeFiltersCount > 0 ? (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal
        visible={isFilterModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.filterModal,
              { backgroundColor: theme.background, borderColor: colorScheme === "dark" ? "#333" : "#ddd" },
            ]}
          >
            <View
              style={[
                styles.filterHeader,
                { borderBottomColor: colorScheme === "dark" ? "#2a2a2a" : "#ececec" },
              ]}
            >
              {/* Fixed header: stays visible while filter content scrolls. */}
              <Text style={[styles.filterHeaderTitle, { color: theme.text }]}>Search & Filter My Pins</Text>
              <TouchableOpacity
              
                style={styles.filterHeaderClose}
                onPress={() => {
                  setOpenDatePicker(null);
                  setIsFilterModalOpen(false);
                }}
              >
                <MaterialIcons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.filterModalScrollContent}
            >
            <TextInput
              style={[
                styles.filterInput,
                {
                  color: theme.text,
                  borderColor: colorScheme === "dark" ? "#3a3a3a" : "#d9d9d9",
                  backgroundColor: colorScheme === "dark" ? "#161616" : "#f8f8f8",
                },
              ]}
              placeholder="Search title, caption, description, address"
              placeholderTextColor={colorScheme === "dark" ? "#777" : "#888"}
              value={filterText}
              onChangeText={setFilterText}
            />

            <TextInput
              style={[
                styles.filterInput,
                {
                  marginTop: 10,
                  color: theme.text,
                  borderColor: colorScheme === "dark" ? "#3a3a3a" : "#d9d9d9",
                  backgroundColor: colorScheme === "dark" ? "#161616" : "#f8f8f8",
                },
              ]}
              placeholder="City/address (e.g. Long Beach, CA)"
              placeholderTextColor={colorScheme === "dark" ? "#777" : "#888"}
              value={locationQuery}
              onChangeText={setLocationQuery}
            />

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Date Range</Text>
            {/* Two-sided date range using segmented pickers instead of manual typing. */}
            <Text style={[styles.dateLabel, { color: theme.text }]}>From</Text>
            <View
              style={[
                styles.datePartRow,
                openDatePicker?.range === "from" ? styles.datePartRowActive : styles.datePartRowInactive,
              ]}
            >
              <View style={styles.datePartCell}>
                <TouchableOpacity
                  style={[
                    styles.datePartButton,
                    {
                      backgroundColor: colorScheme === "dark" ? "#161616" : "#f8f8f8",
                      borderColor: colorScheme === "dark" ? "#3a3a3a" : "#d9d9d9",
                    },
                  ]}
                  onPress={() => openPartPicker("from", "month")}
                >
                  <Text style={[styles.datePartText, { color: theme.text }]}>{dateDisplayText("month", fromMonth)}</Text>
                  <MaterialIcons name={openDatePicker?.range === "from" && openDatePicker.part === "month" ? "expand-less" : "expand-more"} size={18} color={theme.text} />
                </TouchableOpacity>

                {openDatePicker?.range === "from" && openDatePicker.part === "month" ? (
                  <View
                    style={[
                      styles.datePartDropdown,
                      {
                        backgroundColor: theme.background,
                        borderColor: colorScheme === "dark" ? "#333" : "#ddd",
                      },
                    ]}
                  >
                    {/* Dropdown options are generated from the currently active date part. */}
                    <ScrollView style={styles.datePartDropdownList} nestedScrollEnabled>
                      {pickerOptions.map((option) => (
                        <TouchableOpacity
                          key={`from-month-${option.value}`}
                          style={styles.dropdownOption}
                          onPress={() => handleSelectDatePart(option.value)}
                        >
                          <Text style={[styles.dropdownOptionText, { color: theme.text }]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>

              <View style={styles.datePartCell}>
                <TouchableOpacity
                  style={[
                    styles.datePartButton,
                    {
                      backgroundColor: colorScheme === "dark" ? "#161616" : "#f8f8f8",
                      borderColor: colorScheme === "dark" ? "#3a3a3a" : "#d9d9d9",
                    },
                  ]}
                  onPress={() => openPartPicker("from", "day")}
                >
                  <Text style={[styles.datePartText, { color: theme.text }]}>{dateDisplayText("day", fromDay)}</Text>
                  <MaterialIcons name={openDatePicker?.range === "from" && openDatePicker.part === "day" ? "expand-less" : "expand-more"} size={18} color={theme.text} />
                </TouchableOpacity>

                {openDatePicker?.range === "from" && openDatePicker.part === "day" ? (
                  <View
                    style={[
                      styles.datePartDropdown,
                      {
                        backgroundColor: theme.background,
                        borderColor: colorScheme === "dark" ? "#333" : "#ddd",
                      },
                    ]}
                  >
                    <ScrollView style={styles.datePartDropdownList} nestedScrollEnabled>
                      {pickerOptions.map((option) => (
                        <TouchableOpacity
                          key={`from-day-${option.value}`}
                          style={styles.dropdownOption}
                          onPress={() => handleSelectDatePart(option.value)}
                        >
                          <Text style={[styles.dropdownOptionText, { color: theme.text }]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>

              <View style={styles.datePartCell}>
                <TouchableOpacity
                  style={[
                    styles.datePartButton,
                    {
                      backgroundColor: colorScheme === "dark" ? "#161616" : "#f8f8f8",
                      borderColor: colorScheme === "dark" ? "#3a3a3a" : "#d9d9d9",
                    },
                  ]}
                  onPress={() => openPartPicker("from", "year")}
                >
                  <Text style={[styles.datePartText, { color: theme.text }]}>{dateDisplayText("year", fromYear)}</Text>
                  <MaterialIcons name={openDatePicker?.range === "from" && openDatePicker.part === "year" ? "expand-less" : "expand-more"} size={18} color={theme.text} />
                </TouchableOpacity>

                {openDatePicker?.range === "from" && openDatePicker.part === "year" ? (
                  <View
                    style={[
                      styles.datePartDropdown,
                      {
                        backgroundColor: theme.background,
                        borderColor: colorScheme === "dark" ? "#333" : "#ddd",
                      },
                    ]}
                  >
                    <ScrollView style={styles.datePartDropdownList} nestedScrollEnabled>
                      {pickerOptions.map((option) => (
                        <TouchableOpacity
                          key={`from-year-${option.value}`}
                          style={styles.dropdownOption}
                          onPress={() => handleSelectDatePart(option.value)}
                        >
                          <Text style={[styles.dropdownOptionText, { color: theme.text }]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            </View>

            <Text style={[styles.dateLabel, { color: theme.text, marginTop: 8 }]}>To</Text>
            <View
              style={[
                styles.datePartRow,
                openDatePicker?.range === "to" ? styles.datePartRowActive : styles.datePartRowInactive,
              ]}
            >
              <View style={styles.datePartCell}>
                <TouchableOpacity
                  style={[
                    styles.datePartButton,
                    {
                      backgroundColor: colorScheme === "dark" ? "#161616" : "#f8f8f8",
                      borderColor: colorScheme === "dark" ? "#3a3a3a" : "#d9d9d9",
                    },
                  ]}
                  onPress={() => openPartPicker("to", "month")}
                >
                  <Text style={[styles.datePartText, { color: theme.text }]}>{dateDisplayText("month", toMonth)}</Text>
                  <MaterialIcons name={openDatePicker?.range === "to" && openDatePicker.part === "month" ? "expand-less" : "expand-more"} size={18} color={theme.text} />
                </TouchableOpacity>

                {openDatePicker?.range === "to" && openDatePicker.part === "month" ? (
                  <View
                    style={[
                      styles.datePartDropdown,
                      {
                        backgroundColor: theme.background,
                        borderColor: colorScheme === "dark" ? "#333" : "#ddd",
                      },
                    ]}
                  >
                    <ScrollView style={styles.datePartDropdownList} nestedScrollEnabled>
                      {pickerOptions.map((option) => (
                        <TouchableOpacity
                          key={`to-month-${option.value}`}
                          style={styles.dropdownOption}
                          onPress={() => handleSelectDatePart(option.value)}
                        >
                          <Text style={[styles.dropdownOptionText, { color: theme.text }]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>

              <View style={styles.datePartCell}>
                <TouchableOpacity
                  style={[
                    styles.datePartButton,
                    {
                      backgroundColor: colorScheme === "dark" ? "#161616" : "#f8f8f8",
                      borderColor: colorScheme === "dark" ? "#3a3a3a" : "#d9d9d9",
                    },
                  ]}
                  onPress={() => openPartPicker("to", "day")}
                >
                  <Text style={[styles.datePartText, { color: theme.text }]}>{dateDisplayText("day", toDay)}</Text>
                  <MaterialIcons name={openDatePicker?.range === "to" && openDatePicker.part === "day" ? "expand-less" : "expand-more"} size={18} color={theme.text} />
                </TouchableOpacity>

                {openDatePicker?.range === "to" && openDatePicker.part === "day" ? (
                  <View
                    style={[
                      styles.datePartDropdown,
                      {
                        backgroundColor: theme.background,
                        borderColor: colorScheme === "dark" ? "#333" : "#ddd",
                      },
                    ]}
                  >
                    <ScrollView style={styles.datePartDropdownList} nestedScrollEnabled>
                      {pickerOptions.map((option) => (
                        <TouchableOpacity
                          key={`to-day-${option.value}`}
                          style={styles.dropdownOption}
                          onPress={() => handleSelectDatePart(option.value)}
                        >
                          <Text style={[styles.dropdownOptionText, { color: theme.text }]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>

              <View style={styles.datePartCell}>
                <TouchableOpacity
                  style={[
                    styles.datePartButton,
                    {
                      backgroundColor: colorScheme === "dark" ? "#161616" : "#f8f8f8",
                      borderColor: colorScheme === "dark" ? "#3a3a3a" : "#d9d9d9",
                    },
                  ]}
                  onPress={() => openPartPicker("to", "year")}
                >
                  <Text style={[styles.datePartText, { color: theme.text }]}>{dateDisplayText("year", toYear)}</Text>
                  <MaterialIcons name={openDatePicker?.range === "to" && openDatePicker.part === "year" ? "expand-less" : "expand-more"} size={18} color={theme.text} />
                </TouchableOpacity>

                {openDatePicker?.range === "to" && openDatePicker.part === "year" ? (
                  <View
                    style={[
                      styles.datePartDropdown,
                      {
                        backgroundColor: theme.background,
                        borderColor: colorScheme === "dark" ? "#333" : "#ddd",
                      },
                    ]}
                  >
                    <ScrollView style={styles.datePartDropdownList} nestedScrollEnabled>
                      {pickerOptions.map((option) => (
                        <TouchableOpacity
                          key={`to-year-${option.value}`}
                          style={styles.dropdownOption}
                          onPress={() => handleSelectDatePart(option.value)}
                        >
                          <Text style={[styles.dropdownOptionText, { color: theme.text }]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tag</Text>
            {/* "Any" means no tag filtering (all tags allowed). */}
            <View style={{ marginBottom: 6 }}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  selectedTagIds.length === 0 && styles.chipSelected,
                  {
                    borderColor: selectedTagIds.length === 0 ? adwaitaBlue : colorScheme === "dark" ? "#444" : "#ccc",
                    alignSelf: "flex-start",
                  },
                ]}
                onPress={() => setSelectedTagIds([])}
              >
                <Text style={[styles.chipText, { color: selectedTagIds.length === 0 ? "#fff" : theme.text }]}>Any</Text>
              </TouchableOpacity>
            </View>

            {Object.entries(tagsByCategory).map(([category, tags]: [string, any]) => (
              <View key={category} style={{ marginBottom: 10 }}>
                {/* Tags are grouped for easier scanning when many exist. */}
                <Text style={[styles.tagCategoryTitle, { color: theme.text }]}>{category}</Text>
                <View style={[styles.chipRow, { flexDirection: "row", flexWrap: "wrap" }]}>
                  {tags.map((tag: any) => {
                    const selected = selectedTagIds.includes(tag._id);
                    return (
                      <TouchableOpacity
                        key={tag._id}
                        style={[
                          styles.chip,
                          selected && styles.chipSelected,
                          { borderColor: selected ? adwaitaBlue : colorScheme === "dark" ? "#444" : "#ccc" },
                        ]}
                        onPress={() => toggleTagSelection(tag._id)}
                      >
                        <Text style={[styles.chipText, { color: selected ? "#fff" : theme.text }]}>{tag.name}{selected ? " ✓" : ""}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.resetButton]}
                onPress={() => {
                  // Reset clears all filter inputs in one action.
                  setFilterText("");
                  setLocationQuery("");
                  setFromMonth(null);
                  setFromDay(null);
                  setFromYear(null);
                  setToMonth(null);
                  setToDay(null);
                  setToYear(null);
                  setSelectedTagIds([]);
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.applyButton]}
                // Query updates live as state changes; Apply just closes the sheet.
                onPress={() => setIsFilterModalOpen(false)}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AddPinSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        initialLat={selectedLat}
        initialLng={selectedLng}
        initialTitle={selectedTitle}
        initialAddress={selectedAddress}
        minimizeTrigger={minimizeTrigger}
      />

      <ViewEditPinSheet
        isOpen={isViewSheetOpen}
        onClose={() => {
          setIsViewSheetOpen(false);
          setSelectedPin(null);
        }}
        pin={selectedPin}
        minimizeTrigger={minimizeTrigger}
        openTrigger={viewPinTrigger}
      />
    </View>
  );
}


const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#2d2d2d" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#77767b" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#2d2d2d" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#303030" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#26a269" }, { "lightness": -45 }, { "saturation": -20 }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#424242" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#4f4f4f" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#1a5fb4" }, { "lightness": -20 }, { "saturation": -30 }] }
];

const lightMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#faf9f8" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#5e5c64" }] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#faf9f8" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#8ff0a4" }, { "lightness": 30 }, { "saturation": -30 }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#dcdcdc" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#99c1f1" }, { "lightness": 20 }, { "saturation": -20 }] }
];

const styles = StyleSheet.create({
  searchOverlay: { position: 'absolute', left: 20, right: 20, zIndex: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 15, height: 50, elevation: 5, shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  predictionsContainer: { borderRadius: 16, marginTop: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' },
  predictionItem: { padding: 14, borderBottomWidth: 1 },
  predictionMainText: { fontSize: 16, fontWeight: '600' },
  predictionSubText: { fontSize: 12, marginTop: 2 },
  filterFab: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  filterFabText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  filterBadge: {
    marginLeft: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#e01b24",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  filterModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    maxHeight: "80%",
    overflow: "visible",
  },
  filterModalScrollContent: {
    paddingTop: 6,
    paddingBottom: 10,
    overflow: "visible",
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
  },
  filterHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  filterHeaderClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  datePartRow: {
    flexDirection: "row",
    gap: 8,
    overflow: "visible",
  },
  datePartRowActive: {
    zIndex: 200,
    elevation: 20,
  },
  datePartRowInactive: {
    zIndex: 1,
    elevation: 1,
  },
  datePartCell: {
    flex: 1,
    position: "relative",
    overflow: "visible",
  },
  datePartButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  datePartDropdown: {
    position: "absolute",
    top: "100%",
    marginTop: 2,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 500,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: "hidden",
  },
  datePartDropdownList: {
    maxHeight: 180,
  },
  datePartText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipRow: {
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  chipSelected: {
    backgroundColor: "#62a0ea",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tagCategoryTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalActions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  resetButton: {
    backgroundColor: "#ececec",
  },
  resetButtonText: {
    color: "#111",
    fontWeight: "700",
  },
  applyButton: {
    backgroundColor: "#62a0ea",
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownOptionText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
