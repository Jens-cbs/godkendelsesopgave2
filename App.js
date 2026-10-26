// henter de nødvendige moduler og komponenter
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapView, { Marker } from 'react-native-maps';
import styles, { markerPinColor, statusBarStyle } from './styles';

// definerer konstanter og initialiserer navigation stack
const Stack = createNativeStackNavigator();
const SHOPPING_LISTS_STORAGE_KEY = '@min_app/shopping_lists';
const SUPERMARKETS_CACHE_KEY = '@min_app/supermarkets';
const SUPERMARKETS_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
const SUPERMARKET_RADIUS_METERS = 1000;

// definerer komponenter til ikoner og navigation
function ShoppingListIcon({ active }) {
  return (
    <View style={styles.shoppingListIcon} accessibilityElementsHidden>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.iconRow}>
          <View style={[styles.iconCheckbox, active && styles.activeIconPart]} />
          <View style={[styles.iconLine, active && styles.activeIconPart]} />
        </View>
      ))}
    </View>
  );
}
// definerer komponenter til kortets ikon og navigation
function MapIcon({ active }) {
  return (
    <View style={styles.mapIcon} accessibilityElementsHidden>
      <View style={[styles.mapPin, active && styles.activeMapPin]}>
        <View style={styles.mapPinCenter} />
      </View>
    </View>
  );
}
// definerer komponent til bundnavigationen
function BottomNavigation() {
  const navigation = useNavigation();
  const route = useRoute();
  const isMapActive = route.name === 'Map';

  return (
    <View style={styles.bottomNavigation}>
      <Pressable
        accessibilityLabel="Indkøbslister"
        accessibilityRole="button"
        style={[styles.navigationItem, !isMapActive && styles.activeNavigationItem]}
        onPress={() => navigation.navigate('Home')}
      >
        <ShoppingListIcon active={!isMapActive} />
        <Text style={[styles.navigationLabel, !isMapActive && styles.activeNavigationLabel]}>
          Lister
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Kort"
        accessibilityRole="button"
        style={[styles.navigationItem, isMapActive && styles.activeNavigationItem]}
        onPress={() => navigation.navigate('Map')}
      >
        <MapIcon active={isMapActive} />
        <Text style={[styles.navigationLabel, isMapActive && styles.activeNavigationLabel]}>
          Kort
        </Text>
      </Pressable>
    </View>
  );
}
// definerer komponent til skærmlayoutet
function ScreenLayout({ children }) {
  return (
    <View style={styles.container}>
      {children}
      <BottomNavigation />
      <StatusBar style={statusBarStyle} />
    </View>
  );
}
// definerer komponent til startsiden
function HomeScreen({ shoppingLists, storageError, onSelectList }) {
  const navigation = useNavigation();

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Indkøbsliste</Text>
      <Text style={styles.subtitle}>Opret og hold styr på dine indkøbslister.</Text>
      {storageError ? <Text style={styles.emptyText}>{storageError}</Text> : null}
      <Pressable style={styles.button} onPress={() => navigation.navigate('Create')}>
        <Text style={styles.buttonText}>Opret Indkøbsliste</Text>
      </Pressable>
      <Text style={styles.sectionTitle}>Dine indkøbslister</Text>
      <FlatList
        data={shoppingLists}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>Du har ikke oprettet en liste endnu.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.listItem}
            onPress={() => {
              onSelectList(item);
              navigation.navigate('Details');
            }}
          >
            <Text style={styles.listText}>{item.name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
// definerer komponent til oprettelsessiden
function CreateScreen({ listName, onListNameChange, onCreate }) {
  const navigation = useNavigation();

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Ny indkøbsliste</Text>
      <TextInput
        style={styles.input}
        placeholder="Navngiv indkøbsliste"
        value={listName}
        onChangeText={onListNameChange}
        autoFocus
      />
      <Pressable style={styles.button} onPress={onCreate}>
        <Text style={styles.buttonText}>Opret indkøbsliste</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.secondaryButtonText}>Tilbage</Text>
      </Pressable>
    </View>
  );
}
// definerer komponent til detaljesiden
function DetailsScreen({ selectedList, itemName, onItemNameChange, onAddItem }) {
  const navigation = useNavigation();

  if (!selectedList) {
    return null;
  }

  return (
    <View style={styles.content}>
      <Text style={styles.title}>{selectedList.name}</Text>
      <View style={styles.addItemRow}>
        <TextInput
          style={styles.itemInput}
          placeholder="Tilføj en vare"
          value={itemName}
          onChangeText={onItemNameChange}
        />
        <Pressable style={styles.addButton} onPress={onAddItem}>
          <Text style={styles.buttonText}>Tilføj</Text>
        </Pressable>
      </View>
      <FlatList
        data={selectedList.items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>Listen er tom.</Text>}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.listText}>{item.name}</Text>
          </View>
        )}
      />
      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.secondaryButtonText}>Tilbage til forsiden</Text>
      </Pressable>
    </View>
  );
}
// definerer komponent til kortsiden
function MapScreen({ location, locationError, supermarkets, supermarketError, mapRef, locationRegion }) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapReady || !location || !mapRef.current) {
      return;
    }

    if (supermarkets.length > 0) {
      mapRef.current.fitToCoordinates(
        [
          location,
          ...supermarkets.map((supermarket) => ({
            latitude: supermarket.latitude,
            longitude: supermarket.longitude,
          })),
        ],
        { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true },
      );
      return;
    }

    mapRef.current.animateToRegion({ ...location, ...locationRegion }, 500);
  }, [location, locationRegion, mapReady, mapRef, supermarkets]);

  function centerMapOnUser() {
    if (!location || !mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion({ ...location, ...locationRegion }, 500);
  }

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Kort</Text>
      <Text style={styles.subtitle}>Find butikker inden for 1 km og planlæg din indkøbstur</Text>
      {locationError ? <Text style={styles.emptyText}>{locationError}</Text> : null}
      {supermarketError && supermarkets.length === 0 ? (
        <Text style={styles.emptyText}>{supermarketError}</Text>
      ) : null}
      <MapView
        ref={mapRef}
        style={styles.map}
        onMapReady={() => setMapReady(true)}
        initialRegion={{
          latitude: location?.latitude || 55.6761,
          longitude: location?.longitude || 12.5683,
          ...locationRegion,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {supermarkets.map((supermarket) => (
          <Marker
            key={supermarket.id}
            coordinate={{
              latitude: supermarket.latitude,
              longitude: supermarket.longitude,
            }}
            title={supermarket.name}
            pinColor={markerPinColor}
          />
        ))}
      </MapView>
      <Pressable style={styles.button} onPress={centerMapOnUser} disabled={!location}>
        <Text style={styles.buttonText}>Centrer kortet</Text>
      </Pressable>
    </View>
  );
}

function AppContent() {
  const locationRegion = {
    latitudeDelta: 0.018,
    longitudeDelta: 0.03,
  };
  const [listName, setListName] = useState('');
  const [itemName, setItemName] = useState('');
  const [shoppingLists, setShoppingLists] = useState([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [selectedList, setSelectedList] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [supermarkets, setSupermarkets] = useState([]);
  const [supermarketError, setSupermarketError] = useState('');
  const mapRef = useRef(null);

  useEffect(() => {
    async function loadShoppingLists() {
      try {
        const storedLists = await AsyncStorage.getItem(SHOPPING_LISTS_STORAGE_KEY);

        if (storedLists) {
          const parsedLists = JSON.parse(storedLists);

          if (Array.isArray(parsedLists)) {
            setShoppingLists(parsedLists);
          } else {
            throw new Error('Stored shopping lists are not an array.');
          }
        }
      } catch (error) {
        setStorageError('Dine indkøbslister kunne ikke hentes fra lokal lagring.');
      } finally {
        setStorageLoaded(true);
      }
    }

    loadShoppingLists();
  }, []);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    AsyncStorage.setItem(SHOPPING_LISTS_STORAGE_KEY, JSON.stringify(shoppingLists)).catch(() => {
      setStorageError('Dine ændringer kunne ikke gemmes lokalt.');
    });
  }, [shoppingLists, storageLoaded]);

  useEffect(() => {
    async function loadCachedSupermarkets() {
      try {
        const cached = await AsyncStorage.getItem(SUPERMARKETS_CACHE_KEY);

        if (!cached) {
          return;
        }

        const parsedCache = JSON.parse(cached);
        const isRecent = Date.now() - parsedCache.savedAt < SUPERMARKETS_CACHE_MAX_AGE_MS;

        if (isRecent && Array.isArray(parsedCache.stores)) {
          setSupermarkets(parsedCache.stores);
        }
      } catch {
        // A cache miss should not prevent live supermarket lookup.
      }
    }

    loadCachedSupermarkets();
  }, []);

  useEffect(() => {
    async function loadLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationError('Lokationstilladelse blev ikke givet.');
        return;
      }

      const lastKnownLocation = await Location.getLastKnownPositionAsync();

      if (lastKnownLocation) {
        setLocation(lastKnownLocation.coords);
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation.coords);
    }

    loadLocation().catch(() => {
      setLocationError('Din lokation kunne ikke hentes.');
    });
  }, []);

  useEffect(() => {
    if (!location) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadSupermarkets() {
      setSupermarketError('');

      const query = `
        [out:json];
        nwr["shop"="supermarket"](around:${SUPERMARKET_RADIUS_METERS},${location.latitude},${location.longitude});
        out center tags;
      `;
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
      ];
      let lastError;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Supermarket request failed with status ${response.status}`);
          }

          const data = await response.json();
          const stores = data.elements
            .map((element) => ({
              id: String(element.id),
              name: element.tags?.name || 'Supermarked',
              latitude: element.lat || element.center?.lat,
              longitude: element.lon || element.center?.lon,
            }))
            .filter((store) => Number.isFinite(store.latitude) && Number.isFinite(store.longitude));

          setSupermarkets(stores);
          setSupermarketError('');
          await AsyncStorage.setItem(
            SUPERMARKETS_CACHE_KEY,
            JSON.stringify({
              savedAt: Date.now(),
              stores,
            }),
          );
          return;
        } catch (error) {
          if (error.name === 'AbortError') {
            throw error;
          }
          lastError = error;
        }
      }

      throw lastError || new Error('No supermarket service responded.');
    }

    loadSupermarkets().catch((error) => {
      if (error.name !== 'AbortError') {
        setSupermarketError('Supermarkeder kunne ikke hentes lige nu.');
      }
    });

    return () => controller.abort();
  }, [location]);

  function createShoppingList() {
    const trimmedName = listName.trim();

    if (!trimmedName) {
      return;
    }

    const newList = {
      id: Date.now().toString(),
      name: trimmedName,
      items: [],
    };

    setShoppingLists((currentLists) => [...currentLists, newList]);
    setListName('');
  }

  function addItem() {
    const trimmedItemName = itemName.trim();

    if (!trimmedItemName || !selectedList) {
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name: trimmedItemName,
    };
    const updatedList = {
      ...selectedList,
      items: [...selectedList.items, newItem],
    };

    setSelectedList(updatedList);
    setShoppingLists((currentLists) =>
      currentLists.map((list) => (list.id === updatedList.id ? updatedList : list)),
    );
    setItemName('');
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home">
          {() => (
            <ScreenLayout>
              <HomeScreen
                shoppingLists={shoppingLists}
                storageError={storageError}
                onSelectList={(list) => {
                  setSelectedList(list);
                }}
              />
            </ScreenLayout>
          )}
        </Stack.Screen>
        <Stack.Screen name="Create">
          {({ navigation }) => (
            <ScreenLayout>
              <CreateScreen
                listName={listName}
                onListNameChange={setListName}
                onCreate={() => {
                  createShoppingList();
                  navigation.navigate('Home');
                }}
              />
            </ScreenLayout>
          )}
        </Stack.Screen>
        <Stack.Screen name="Details">
          {() => (
            <ScreenLayout>
              <DetailsScreen
                selectedList={selectedList}
                itemName={itemName}
                onItemNameChange={setItemName}
                onAddItem={addItem}
              />
            </ScreenLayout>
          )}
        </Stack.Screen>
        <Stack.Screen name="Map">
          {() => (
            <ScreenLayout>
              <MapScreen
                location={location}
                locationError={locationError}
                supermarkets={supermarkets}
                supermarketError={supermarketError}
                mapRef={mapRef}
                locationRegion={locationRegion}
              />
            </ScreenLayout>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppContent; // definerer hovedkomponenten til appen
