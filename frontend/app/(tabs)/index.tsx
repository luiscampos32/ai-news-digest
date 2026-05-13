import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ScrollView, Linking, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';

const API_PORT = 8000;
const CATEGORIES = ['technology', 'business', 'science', 'health', 'entertainment'];

/**
 * API URL for `/api/news`.
 * - Production / EAS: set `EXPO_PUBLIC_API_URL` to your Render origin (no trailing slash), e.g. `https://ai-news-api.onrender.com`.
 * - Local dev: uses Metro host, emulator loopback, or 127.0.0.1. Run `uvicorn main:app --reload --host 0.0.0.0` for a physical device.
 */
function getNewsApiBase(): string {
  const path = '/api/news';
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return `${fromEnv.replace(/\/$/, '')}${path}`;
  }
  if (!__DEV__) {
    return `http://127.0.0.1:${API_PORT}${path}`;
  }
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : undefined;

  if (Platform.OS === 'android') {
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return `http://${host}:${API_PORT}${path}`;
    }
    return `http://10.0.2.2:${API_PORT}${path}`;
  }

  if (host && host !== '127.0.0.1' && host !== 'localhost') {
    return `http://${host}:${API_PORT}${path}`;
  }
  return `http://127.0.0.1:${API_PORT}${path}`;
}

export default function NewsFeed() {
  const [selectedCategory, setSelectedCategory] = useState('technology');
  const [newsData, setNewsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCategoryNews = async (cat: string) => {
    setLoading(true);
    try {
      const url = `${getNewsApiBase()}?category=${encodeURIComponent(cat)}`;
      const response = await fetch(url);
      if (!response.ok) {
        setNewsData({ error: `Server returned ${response.status}` });
        return;
      }
      const data = await response.json();
      setNewsData(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setNewsData({
        error: `${message}. On a real device use the same Wi-Fi as your PC and run uvicorn with --host 0.0.0.0.`,
      });
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryNews(selectedCategory);
  }, [selectedCategory]);

  const renderArticle = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => Linking.openURL(item.link)}>
      {item.image && <Image source={{ uri: item.image }} style={styles.cardImage} />}
      <View style={styles.cardContent}>
        <Text style={styles.sourceText}>{item.source?.toUpperCase()}</Text>
        <Text style={styles.titleText}>{item.title}</Text>
        <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header & Category Chips remain the same */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>News Digest</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setSelectedCategory(cat)}
              style={[styles.chip, selectedCategory === cat && styles.activeChip]}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
  
      {/* AI Category Summary */}
      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
      ) : newsData?.summary ? (
        <BlurView intensity={40} tint="dark" style={styles.summaryBox}>
          <Text style={styles.summaryText}>✨ {newsData.summary}</Text>
        </BlurView>
      ) : null}
  
      {/* The News Feed with Empty State */}
      {!loading &&
        (newsData?.articles?.length ?? 0) === 0 &&
        !newsData?.error &&
        !newsData?.summary && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#94A3B8' }}>No headlines found for {selectedCategory}.</Text>
        </View>
      )}
  
      {newsData?.error && (
        <View style={{ padding: 20, backgroundColor: '#7F1D1D', margin: 16, borderRadius: 8 }}>
          <Text style={{ color: '#F8FAFC' }}>Error: {newsData.error}</Text>
        </View>
      )}
  
      <FlatList
        style={{ flex: 1 }}
        data={newsData?.articles || []}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderArticle}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={() => fetchCategoryNews(selectedCategory)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center',flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 60, paddingHorizontal: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 16 },
  chipScroll: { marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#334155' },
  activeChip: { backgroundColor: '#3B82F6' },
  chipText: { color: '#94A3B8', fontWeight: '600' },
  activeChipText: { color: '#FFF' },
  summaryBox: { margin: 16, padding: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryText: { color: '#E2E8F0', fontStyle: 'italic', fontSize: 14, textAlign: 'center' },
  listContent: { padding: 16 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, marginBottom: 16, overflow: 'hidden', elevation: 3 },
  cardImage: { width: '100%', height: 180 },
  cardContent: { padding: 16 },
  sourceText: { color: '#3B82F6', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  titleText: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  descText: { color: '#94A3B8', fontSize: 14, lineHeight: 20 },
});