// components/ViewEditPinSheet.tsx
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/convex/_generated/api';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Dimensions, Keyboard, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ViewEditPinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pin: any | null;
  minimizeTrigger?: number;
  openTrigger?: number;
}

export default function ViewEditPinSheet({ isOpen, onClose, pin, minimizeTrigger, openTrigger }: ViewEditPinSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [dynamicSnap, setDynamicSnap] = useState(Dimensions.get('window').height * 0.7);
  const snapPoints = useMemo(() => ['4%', '45%', dynamicSnap], [dynamicSnap]);
  const [sheetIndex, setSheetIndex] = useState(0);

  // --- Convex Queries & Mutations ---
  const updatePin = useMutation(api.pins.updatePin);
  const sharePin = useMutation(api.pins.sharePin);
  const currentUser = useQuery(api.users.getCurrentUser);
  const friends = useQuery(api.friends.listFriends, currentUser?._id ? { userId: currentUser._id } : "skip");
  const allTags = useQuery(api.pinTags.getAllTags);
  const pinTags = useQuery(api.pinTags.getTagsForPin, pin ? { pinId: pin._id } : "skip");
  const pinPictures = useQuery(api.pins.getPinPictures, pin ? { pinId: pin._id } : "skip");
  const pinComments = useQuery(api.pins.getPinComments, pin ? { pinId: pin._id } : "skip");
  const addPinComment = useMutation(api.pins.addPinComment);
  const createTag = useMutation(api.pinTags.createTag);
  const addTagToPin = useMutation(api.pinTags.addTagToPin);
  const removeTagFromPin = useMutation(api.pinTags.removeTagFromPin);

  // --- State ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [sharingToUserId, setSharingToUserId] = useState<string | null>(null);
  const [allowRecipientEdit, setAllowRecipientEdit] = useState(false);

  // Organize tags by category for the modal
  const tagsByCategory = allTags ? allTags.reduce((acc: any, tag: any) => {
    const category = tag.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {}) : {};

  // --- Smooth Snapping Logic ---
  const programmaticSnapRef = useRef(false);
  const programmaticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapTo = (index: number) => {
    programmaticSnapRef.current = true;
    bottomSheetRef.current?.snapToIndex(index);

    if (programmaticTimeoutRef.current) clearTimeout(programmaticTimeoutRef.current);
    programmaticTimeoutRef.current = setTimeout(() => {
      programmaticSnapRef.current = false;
    }, 100);
  };

  useEffect(() => {
    if (minimizeTrigger && minimizeTrigger > 0) {
      Keyboard.dismiss();
      snapTo(0);
    }
  }, [minimizeTrigger]);

  useEffect(() => {
    const backAction = () => {
      if (sheetIndex > 0) {
        snapTo(0);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [sheetIndex]);

  useEffect(() => {
    if (isOpen && pin) {
      setTitle(pin.title || '');
      setDescription(pin.caption || pin.description || '');
      snapTo(1);

      // In some navigation/modal stacks the sheet ref initializes a tick later.
      // Retry snapping shortly after open so the sheet is actually visible.
      const t1 = setTimeout(() => snapTo(1), 30);
      const t2 = setTimeout(() => snapTo(1), 120);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      bottomSheetRef.current?.close();
      Keyboard.dismiss();
    }
  }, [isOpen, pin, openTrigger]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      if (!isOpen) return;

      let kbHeight = e.endCoordinates.height;
      if (Platform.OS === 'android' && kbHeight < 100) {
        const screenHeight = Dimensions.get('screen').height;
        const windowHeight = Dimensions.get('window').height;
        kbHeight = screenHeight - windowHeight;
      }
      setDynamicSnap(kbHeight + 320);
      setTimeout(() => snapTo(2), 10);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (!isOpen) return;
      snapTo(1);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [isOpen]);

  // --- Tag Logic ---
  const toggleTagSelection = async (tag: any) => {
    if (!pin) return;
    const isSelected = pinTags?.some((t: any) => t._id === tag._id);
    try {
      if (isSelected) {
        await removeTagFromPin({ pinId: pin._id, tagId: tag._id });
      } else {
        await addTagToPin({ pinId: pin._id, tagId: tag._id });
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to toggle tag");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert("Error", "Tag name cannot be empty");
      return;
    }
    try {
      const newTagId = await createTag({ name: newTagName, color: selectedColor });
      if (pin) {
        await addTagToPin({ pinId: pin._id, tagId: newTagId });
      }
      setNewTagName("");
      setSelectedColor("#3b82f6");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create tag");
    }
  };

  const handleUpdate = async () => {
    if (!pin) return;
    setIsSubmitting(true);
    try {
      await updatePin({
        pinId: pin._id,
        title,
        description,
        caption: description
      });
      onClose();
    } catch (e: any) {
      console.error('Failed to update pin: ', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!pin) return;
    if (!newComment.trim()) {
      return;
    }

    setIsSubmittingComment(true);
    try {
      await addPinComment({
        pinId: pin._id,
        text: newComment,
      });
      setNewComment("");
    } catch (err: any) {
      const backendMessage = typeof err?.data === 'string' ? err.data : err?.data?.message;
      Alert.alert("Error", backendMessage ?? err?.message ?? "Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSharePin = async (friendId: any, friendName: string) => {
    if (!pin) return;

    setSharingToUserId(friendId.toString());
    try {
      const result = await sharePin({ pinId: pin._id, toUserId: friendId, canEdit: allowRecipientEdit });
      if (result?.alreadyRequested) {
        const statusLabel = result?.requestStatus === "accepted"
          ? "already accepted"
          : result?.requestStatus === "rejected"
            ? "previously rejected"
            : "already pending";
        Alert.alert("Already requested", `A share request for ${friendName} is ${statusLabel}.`);
      } else {
        Alert.alert(
          "Request sent",
          allowRecipientEdit
            ? `Share request sent to ${friendName} with edit access.`
            : `Share request sent to ${friendName}.`
        );
      }
      setShowShareModal(false);
      setAllowRecipientEdit(false);
    } catch (err: any) {
      const backendMessage =
        typeof err?.data === 'string'
          ? err.data
          : err?.data?.message;
      Alert.alert("Error", backendMessage ?? err?.message ?? "Failed to share pin");
    } finally {
      setSharingToUserId(null);
    }
  };

  if (!pin) return null;

  const currentUserId = currentUser?._id ? currentUser._id.toString() : null;
  const isOwner = currentUserId !== null && pin.ownerId === currentUserId;
  const canEditPin = isOwner || pin.canEdit === true;
  const canCommentPin = pin.canComment === true || isOwner;

  // Format the date the pin was created (or fallback to today)
  const displayDate = pin.createdAt
    ? new Date(pin.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isOpen && pin ? 1 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      onChange={setSheetIndex}
      onAnimate={(fromIndex, toIndex) => {
        if (programmaticSnapRef.current) return;
        if (toIndex - fromIndex > 1) {
          snapTo(fromIndex + 1);
        }
        else if (fromIndex - toIndex > 1) {
          snapTo(fromIndex - 1);
        }
      }}
      backgroundStyle={[styles.sheetBackground, { backgroundColor: theme.background }]}
      handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colorScheme === 'dark' ? '#444' : '#ddd' }]}
    >
      <BottomSheetScrollView style={styles.scrollWrapper} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.closeRow}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { borderColor: colorScheme === 'dark' ? '#444' : '#ddd' }]}
          >
            <Text style={[styles.closeButtonText, { color: theme.text }]}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {isOwner ? (
            <TouchableOpacity style={[styles.addImageButton, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0' }]}>
              <IconSymbol name="add" size={48} color={theme.text} />
            </TouchableOpacity>
          ) : null}
          {pinPictures && pinPictures.length > 0 ? (
            pinPictures.map((picture: { storageId: string; url: string | null }) => (
              <View key={picture.storageId} style={styles.imagePreviewContainer}>
                {picture.url ? <Image source={{ uri: picture.url }} style={styles.previewImage} contentFit="cover" /> : null}
              </View>
            ))
          ) : (
            <View style={[styles.placeholderImageBox, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fafafa', borderColor: colorScheme === 'dark' ? '#333' : '#eee' }]}>
              <IconSymbol name="photo-library" size={32} color={colorScheme === 'dark' ? '#444' : '#ccc'} />
            </View>
          )}
        </ScrollView>

        <View style={styles.formContainer}>
          <View style={styles.titleRow}>
            <TextInput
              style={[styles.titleInput, { color: theme.text }]}
              placeholder="Location Name"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
              value={title}
              onChangeText={setTitle}
              onFocus={() => {
                if (canEditPin) snapTo(2);
              }}
              editable={canEditPin}
            />
            <Text style={[styles.dateText, { color: colorScheme === 'dark' ? '#666' : '#888' }]}>{displayDate}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaButtonsGroup}>
              <TouchableOpacity
                style={[styles.metaButton, !canEditPin && { opacity: 0.7 }]}
                onPress={() => {
                  if (canEditPin) {
                    setShowTagModal(true);
                  }
                }}
                disabled={!canEditPin}
              >
                <IconSymbol name="star" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
                <Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>{canEditPin ? 'Tags +' : 'Tags'}</Text>
              </TouchableOpacity>

              {isOwner ? (
                <TouchableOpacity style={styles.metaButton} onPress={() => setShowShareModal(true)}>
                  <IconSymbol name="person-add" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
                  <Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>Share</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.addressContainer}>
              <IconSymbol name="place" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
              <Text style={[styles.addressText, { color: colorScheme === 'dark' ? '#888' : '#666' }]} numberOfLines={2}>
                {pin.address || "No address provided"}
              </Text>
            </View>
          </View>

          {/* Render Selected Tags */}
          {pinTags && pinTags.length > 0 && (
            <View style={styles.selectedTagsContainer}>
              {pinTags.map((tag: any) => (
                <View key={tag._id} style={[styles.selectedTagPill, { backgroundColor: tag.color || '#3b82f6' }]}>
                  <Text style={styles.selectedTagText}>{tag.name}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.notesAndSaveRow, sheetIndex === 2 && styles.notesAndSaveRowExpanded]}>
            <TextInput
              style={[styles.notesInput, sheetIndex === 2 && styles.notesInputExpanded, { color: theme.text }]}
              placeholder="Add Notes..."
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
              multiline={true}
              value={description}
              onChangeText={setDescription}
              onFocus={() => {
                if (canEditPin) snapTo(2);
              }}
              editable={canEditPin}
            />

            {canEditPin ? (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={[styles.commentsSection, { borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
            <Text style={[styles.commentsTitle, { color: theme.text }]}>Comments</Text>

            {pinComments === undefined ? (
              <Text style={[styles.commentsHint, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>Loading comments...</Text>
            ) : pinComments.length === 0 ? (
              <Text style={[styles.commentsHint, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>No comments yet.</Text>
            ) : (
              <View style={styles.commentsList}>
                {pinComments.map((comment: any) => (
                  <View key={comment._id} style={[styles.commentItem, { borderBottomColor: colorScheme === 'dark' ? '#2a2a2a' : '#f0f0f0' }]}>
                    <Text style={[styles.commentAuthor, { color: theme.text }]}>{comment.userName}</Text>
                    <Text style={[styles.commentText, { color: theme.text }]}>{comment.text}</Text>
                    <Text style={[styles.commentTime, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>
                      {new Date(comment.updatedAt).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {canCommentPin ? (
              <View style={styles.commentInputRow}>
                <TextInput
                  style={[styles.commentInput, { color: theme.text, borderColor: colorScheme === 'dark' ? '#444' : '#ddd', backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#fff' }]}
                  placeholder="Write a comment..."
                  placeholderTextColor={colorScheme === 'dark' ? '#777' : '#999'}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.commentSendButton, { opacity: isSubmittingComment || !newComment.trim() ? 0.6 : 1 }]}
                  onPress={handleAddComment}
                  disabled={isSubmittingComment || !newComment.trim()}
                >
                  {isSubmittingComment ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.commentSendText}>Post</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.commentsHint, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>You can view this pin but cannot comment.</Text>
            )}
          </View>
        </View>
      </BottomSheetScrollView>

      {/* Tags Modal */}
      <Modal visible={showTagModal} animationType="slide" transparent={true} onRequestClose={() => setShowTagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Manage Tags</Text>
              <TouchableOpacity onPress={() => setShowTagModal(false)}>
                <Text style={[styles.modalCloseText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {Object.entries(tagsByCategory).map(([category, tags]: [string, any]) => (
                <View key={category} style={{ marginBottom: 20 }}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>{category}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {tags && tags.map((tag: any) => {
                      const isSelected = pinTags?.some((t: any) => t._id === tag._id);
                      return (
                        <TouchableOpacity
                          key={tag._id}
                          onPress={() => toggleTagSelection(tag)}
                          style={[styles.tagOption, { backgroundColor: isSelected ? (tag.color || "#3b82f6") : (colorScheme === 'dark' ? '#333' : "#e5e7eb"), borderWidth: isSelected ? 0 : 1, borderColor: colorScheme === 'dark' ? '#444' : '#ccc' }]}
                        >
                          <Text style={[styles.tagOptionText, { color: isSelected ? "#fff" : theme.text }]}>{tag.name}{isSelected ? " ✓" : ""}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              <View style={[styles.createTagSection, { borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>Create New Tag</Text>
                <TextInput
                  value={newTagName}
                  onChangeText={setNewTagName}
                  placeholder="Tag name..."
                  placeholderTextColor="#666"
                  style={[styles.newTagInput, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#fff', color: theme.text, borderColor: colorScheme === 'dark' ? '#444' : '#ccc' }]}
                />
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Choose a color:</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"].map((color) => (
                    <TouchableOpacity key={color} onPress={() => setSelectedColor(color)} style={[styles.colorCircle, { backgroundColor: color, borderWidth: selectedColor === color ? 3 : 0, borderColor: theme.text }]} />
                  ))}
                </View>
                <TouchableOpacity style={styles.createTagButton} onPress={handleCreateTag}>
                  <Text style={styles.createTagButtonText}>Create Tag</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Share Modal */}
      <Modal visible={showShareModal} animationType="slide" transparent={true} onRequestClose={() => setShowShareModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}> 
            <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Share Pin</Text>
              <TouchableOpacity onPress={() => {
                setShowShareModal(false);
                setAllowRecipientEdit(false);
              }}>
                <Text style={[styles.modalCloseText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <View style={[styles.sharePermissionRow, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.sharePermissionTitle, { color: theme.text }]}>Allow recipient to edit</Text>
                  <Text style={[styles.sharePermissionSubtitle, { color: colorScheme === 'dark' ? '#aaa' : '#666' }]}>They can update title, notes, and tags after accepting.</Text>
                </View>
                <Switch
                  value={allowRecipientEdit}
                  onValueChange={setAllowRecipientEdit}
                  trackColor={{ false: '#767577', true: '#34C759' }}
                  thumbColor="#fff"
                />
              </View>

              {!friends ? (
                <Text style={{ color: theme.text, opacity: 0.7 }}>Loading friends...</Text>
              ) : friends.length === 0 ? (
                <Text style={{ color: theme.text, opacity: 0.7 }}>Add friends first to share this pin.</Text>
              ) : (
                friends.map((friend: any) => {
                  const friendName = friend.name || friend.username || "Friend";
                  const isSharing = sharingToUserId === friend._id.toString();

                  return (
                    <View
                      key={friend._id.toString()}
                      style={[styles.shareRow, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}
                    >
                      <Text style={[styles.shareName, { color: theme.text }]}>{friendName}</Text>
                      <TouchableOpacity
                        style={[styles.shareButton, { opacity: isSharing ? 0.7 : 1 }]}
                        onPress={() => handleSharePin(friend._id, friendName)}
                        disabled={isSharing}
                      >
                        {isSharing ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.shareButtonText}>Share</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  handleIndicator: {
    width: 40
  },
  scrollWrapper: {
    flex: 1
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20
  },
  closeRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  closeButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  imageScroll: {
    flexGrow: 0,
    marginBottom: 20
  },
  addImageButton: {
    width: 100,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  placeholderImageBox: {
    width: 100,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  imagePreviewContainer: {
    width: 100,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
    position: 'relative'
  },
  previewImage: {
    width: '100%',
    height: '100%'
  },
  formContainer: {
    flex: 1
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    marginRight: 10
  },
  dateText: {
    fontSize: 14
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  metaButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  metaText: {
    marginLeft: 4,
    fontSize: 14
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: 15
  },
  addressText: {
    marginLeft: 4,
    fontSize: 14,
    textAlign: 'right',
    flexShrink: 1
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 15
  },
  selectedTagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  selectedTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  notesAndSaveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20
  },
  notesAndSaveRowExpanded: {
    flex: 1,
    alignItems: 'flex-start'
  },
  notesInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 60
  },
  notesInputExpanded: {
    flex: 1,
    maxHeight: '100%',
    textAlignVertical: 'top'
  },
  commentsSection: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  commentsHint: {
    fontSize: 13,
    marginBottom: 10,
  },
  commentsList: {
    marginBottom: 10,
  },
  commentItem: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 11,
    marginTop: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 6,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 42,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  commentSendButton: {
    backgroundColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "85%",
    minHeight: "50%"
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600"
  },
  modalCloseText: {
    fontSize: 24
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16
  },
  tagOptionText: {
    fontSize: 13,
    fontWeight: "500"
  },
  createTagSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    paddingBottom: 40
  },
  newTagInput: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  createTagButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  createTagButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  shareName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  shareButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 84,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  sharePermissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 10,
  },
  sharePermissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  sharePermissionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  }
});
