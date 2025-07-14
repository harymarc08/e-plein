import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Alert, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  BackHandler, 
  ScrollView, 
  StyleSheet,
  Dimensions 
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Picker } from '@react-native-picker/picker';

const { width: screenWidth } = Dimensions.get('window');
let db: SQLite.SQLiteDatabase | null = null;

const colors = {
  primary: '#3b82f6',
  primaryLight: '#eff6ff',
  primaryDark: '#1e40af',
  accent: '#22c55e',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#ffffff',
  red50: '#fef2f2',
  red600: '#dc2626',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export default function VehiculeScreen() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editVehicule, setEditVehicule] = useState<any>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [essences, setEssences] = useState<any[]>([]);
  const [addVehicule, setAddVehicule] = useState({
    immatriculation: '', marque: '', modele: '', annee: currentYear.toString(), type_essence_id: ''
  });

  useEffect(() => {
    db = SQLite.openDatabaseSync('carburant.db');
    setDbReady(true);
    db.getAllAsync('SELECT * FROM TypeEssence').then(setEssences).catch(() => setEssences([]));
  }, []);

  const fetchVehicules = async () => {
    if (!db) return;
    try {
      const result = await db.getAllAsync('SELECT * FROM Vehicule');
      setVehicules(result);
    } catch (e) {
      setVehicules([]);
    }
  };

  useEffect(() => {
    if (dbReady) fetchVehicules();
  }, [dbReady]);

  const ajouterVehicule = async () => {
    if (!addVehicule.immatriculation || !addVehicule.type_essence_id) {
      Alert.alert('Erreur', 'Immatriculation et type d\'essence obligatoires');
      return;
    }
    if (!db) return;
    try {
      await db.runAsync(
        'INSERT INTO Vehicule (immatriculation, marque, modele, annee, type_essence_id) VALUES (?, ?, ?, ?, ?)',
        [addVehicule.immatriculation, addVehicule.marque, addVehicule.modele, parseInt(addVehicule.annee), parseInt(addVehicule.type_essence_id)]
      );
      setAddVehicule({ immatriculation: '', marque: '', modele: '', annee: currentYear.toString(), type_essence_id: '' });
      setAddModalVisible(false);
      fetchVehicules();
      db.getAllAsync('SELECT * FROM TypeEssence').then(setEssences).catch(() => setEssences([]));
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const supprimerVehicule = async (id: number) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer ce véhicule ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
            if (!db) return;
            try {
              await db.runAsync('DELETE FROM Vehicule WHERE id = ?', [id]);
              fetchVehicules();
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          }
        }
      ]
    );
  };

  const ouvrirEdition = (vehicule: any) => {
    setEditVehicule({ ...vehicule });
    setEditModalVisible(true);
  };

  const modifierVehicule = async () => {
    if (!db || !editVehicule) return;
    try {
      await db.runAsync(
        'UPDATE Vehicule SET immatriculation = ?, marque = ?, modele = ?, annee = ?, type_essence_id = ? WHERE id = ?',
        [editVehicule.immatriculation, editVehicule.marque, editVehicule.modele, parseInt(editVehicule.annee), parseInt(editVehicule.type_essence_id), editVehicule.id]
      );
      setEditModalVisible(false);
      setEditVehicule(null);
      fetchVehicules();
      db.getAllAsync('SELECT * FROM TypeEssence').then(setEssences).catch(() => setEssences([]));
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  useEffect(() => {
    if (addModalVisible) {
      const backAction = () => {
        setAddModalVisible(false);
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [addModalVisible]);

  useEffect(() => {
    if (editModalVisible) {
      const backAction = () => {
        setEditModalVisible(false);
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [editModalVisible]);

  const renderVehiculeItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>
              {item.immatriculation}
            </Text>
            <Text style={styles.cardSubtitle}>
              {item.marque} {item.modele}
            </Text>
            <Text style={styles.cardDetail}>
              Année: {item.annee}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => ouvrirEdition(item)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>
                ✏️ Modifier
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => supprimerVehicule(item.id)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>
                🗑️ Suppr.
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              Mes Véhicules
            </Text>
            <Text style={styles.headerSubtitle}>
              {vehicules.length} véhicule{vehicules.length > 1 ? 's' : ''} enregistré{vehicules.length > 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vehicle List */}
      {vehicules.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>🚗</Text>
          </View>
          <Text style={styles.emptyTitle}>
            Aucun véhicule
          </Text>
          <Text style={styles.emptyDescription}>
            Ajoutez votre premier véhicule pour commencer à suivre votre consommation de carburant.
          </Text>
        </View>
      ) : (
        <FlatList
          data={vehicules}
          renderItem={renderVehiculeItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Vehicle Modal */}
      <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Nouveau véhicule</Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Immatriculation *</Text>
                <TextInput
                  value={addVehicule.immatriculation}
                  onChangeText={text => setAddVehicule({...addVehicule, immatriculation: text})}
                  placeholder="Ex: AB-123-CD"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Marque</Text>
                <TextInput
                  value={addVehicule.marque}
                  onChangeText={text => setAddVehicule({...addVehicule, marque: text})}
                  placeholder="Ex: Peugeot, Renault..."
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Modèle</Text>
                <TextInput
                  value={addVehicule.modele}
                  onChangeText={text => setAddVehicule({...addVehicule, modele: text})}
                  placeholder="Ex: 308, Clio..."
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Année</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={addVehicule.annee}
                    onValueChange={value => setAddVehicule({...addVehicule, annee: value})}
                    style={styles.picker}
                  >
                    {years.map(year => (
                      <Picker.Item key={year} label={year.toString()} value={year.toString()} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type d'essence *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={addVehicule.type_essence_id}
                    onValueChange={value => setAddVehicule({...addVehicule, type_essence_id: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="Sélectionner..." value="" />
                    {essences.map(essence => (
                      <Picker.Item key={essence.id} label={essence.nom} value={essence.id.toString()} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={ajouterVehicule}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Vehicle Modal */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Modifier véhicule</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            {editVehicule && (
              <View style={styles.formSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Immatriculation</Text>
                  <TextInput
                    value={editVehicule.immatriculation}
                    onChangeText={text => setEditVehicule({...editVehicule, immatriculation: text})}
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Marque</Text>
                  <TextInput
                    value={editVehicule.marque}
                    onChangeText={text => setEditVehicule({...editVehicule, marque: text})}
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Modèle</Text>
                  <TextInput
                    value={editVehicule.modele}
                    onChangeText={text => setEditVehicule({...editVehicule, modele: text})}
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Année</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editVehicule.annee?.toString()}
                      onValueChange={value => setEditVehicule({...editVehicule, annee: parseInt(value)})}
                      style={styles.picker}
                    >
                      {years.map(year => (
                        <Picker.Item key={year} label={year.toString()} value={year.toString()} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Type d'essence</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editVehicule.type_essence_id?.toString()}
                      onValueChange={value => setEditVehicule({...editVehicule, type_essence_id: parseInt(value)})}
                      style={styles.picker}
                    >
                      {essences.map(essence => (
                        <Picker.Item key={essence.id} label={essence.nom} value={essence.id.toString()} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={modifierVehicule}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: colors.primaryLight,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: colors.white,
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 16,
    color: colors.gray600,
  },
  cardDetail: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: colors.red50,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: colors.red600,
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    backgroundColor: colors.gray200,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 24,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 18,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: colors.gray700,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.gray50,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  picker: {
    height: 50,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.gray100,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.gray700,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
});
