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
import { Picker } from '@react-native-picker/picker';
import * as SQLite from 'expo-sqlite';
import { useIsFocused } from '@react-navigation/native';

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
  blue500: '#3b82f6',
  orange500: '#f97316',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

let db: SQLite.SQLiteDatabase | null = null;

export default function PleinScreen() {
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [essences, setEssences] = useState<any[]>([]);
  const [pleins, setPleins] = useState<any[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addPlein, setAddPlein] = useState({
    vehiculeId: '',
    kmPrecedent: '',
    kmActuel: '',
    quantite: '',
    prixPlein: '',
    dateHeure: new Date().toISOString().slice(0, 16)
  });
  const [editPlein, setEditPlein] = useState<any>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    db = SQLite.openDatabaseSync('carburant.db');
    setDbReady(true);
  }, []);

  useEffect(() => {
    if (!dbReady || !db || !isFocused) return;
    db.getAllAsync('SELECT * FROM Vehicule').then(setVehicules).catch(() => setVehicules([]));
    db.getAllAsync('SELECT * FROM TypeEssence').then(setEssences).catch(() => setEssences([]));
    fetchPleins();
  }, [dbReady, isFocused]);

  const fetchPleins = async () => {
    if (!db) return;
    try {
      const result = await db.getAllAsync(`
        SELECT ce.*, v.immatriculation, v.marque, v.modele 
        FROM CarburantEntree ce 
        JOIN Vehicule v ON ce.vehicule_id = v.id 
        ORDER BY ce.date_heure DESC
      `);
      setPleins(result);
    } catch (e) {
      setPleins([]);
    }
  };

  const ajouterPlein = async () => {
    if (!addPlein.vehiculeId || !addPlein.kmPrecedent || !addPlein.kmActuel || !addPlein.quantite) {
      Alert.alert('Erreur', 'Tous les champs obligatoires doivent être remplis');
      return;
    }
    if (!db) return;
    try {
      await db.runAsync(
        'INSERT INTO CarburantEntree (vehicule_id, date_heure, km_precedent, km_actuel, quantite_litres, prix_plein) VALUES (?, ?, ?, ?, ?, ?)',
        [parseInt(addPlein.vehiculeId), addPlein.dateHeure, parseInt(addPlein.kmPrecedent), parseInt(addPlein.kmActuel), parseFloat(addPlein.quantite), parseFloat(addPlein.prixPlein) || 0]
      );
      setAddPlein({ vehiculeId: '', kmPrecedent: '', kmActuel: '', quantite: '', prixPlein: '', dateHeure: new Date().toISOString().slice(0, 16) });
      setAddModalVisible(false);
      fetchPleins();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const ouvrirEdition = (plein: any) => {
    setEditPlein({
      id: plein.id,
      vehiculeId: plein.vehicule_id?.toString() ?? '',
      kmPrecedent: plein.km_precedent?.toString() ?? '',
      kmActuel: plein.km_actuel?.toString() ?? '',
      quantite: plein.quantite_litres?.toString() ?? '',
      prixPlein: plein.prix_plein?.toString() ?? '',
      dateHeure: plein.date_heure?.slice(0, 16) ?? ''
    });
    setEditModalVisible(true);
  };

  const modifierPlein = async () => {
    if (!db || !editPlein) return;
    const { id, vehiculeId, kmPrecedent, kmActuel, quantite, prixPlein, dateHeure } = editPlein;
    if (!vehiculeId || !kmPrecedent || !kmActuel || !quantite) {
      Alert.alert('Erreur', 'Tous les champs obligatoires doivent être remplis');
      return;
    }
    try {
      await db.runAsync(
        'UPDATE CarburantEntree SET vehicule_id = ?, date_heure = ?, km_precedent = ?, km_actuel = ?, quantite_litres = ?, prix_plein = ? WHERE id = ?',
        [parseInt(vehiculeId), dateHeure, parseInt(kmPrecedent), parseInt(kmActuel), parseFloat(quantite), parseFloat(prixPlein) || 0, id]
      );
      setEditModalVisible(false);
      setEditPlein(null);
      fetchPleins();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const supprimerPlein = async (id: number) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer ce plein ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
            if (!db) return;
            try {
              await db.runAsync('DELETE FROM CarburantEntree WHERE id = ?', [id]);
              fetchPleins();
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          }
        }
      ]
    );
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderPleinItem = ({ item }: { item: any }) => (
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
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {formatDate(item.date_heure)}
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailsLeft}>
            <View style={styles.detailRow}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <Text style={styles.detailText}>
                {item.km_precedent} → {item.km_actuel} km
              </Text>
            </View>
            <View style={styles.detailRow}>
              <View style={[styles.dot, { backgroundColor: colors.blue500 }]} />
              <Text style={styles.detailText}>
                {item.quantite_litres} L
              </Text>
            </View>
            {item.prix_plein > 0 && (
              <View style={styles.detailRow}>
                <View style={[styles.dot, { backgroundColor: colors.orange500 }]} />
                <Text style={styles.detailText}>
                  {item.prix_plein.toFixed(2)} FMG
                </Text>
              </View>
            )}
          </View>
          <View style={styles.kmContainer}>
            <Text style={styles.kmNumber}>
              {(item.km_actuel - item.km_precedent)} km
            </Text>
            <Text style={styles.kmLabel}>
              parcourus
            </Text>
          </View>
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
            onPress={() => supprimerPlein(item.id)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>
              🗑️ Suppr.
            </Text>
          </TouchableOpacity>
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
              Pleins d'Essence
            </Text>
            <Text style={styles.headerSubtitle}>
              {pleins.length} plein{pleins.length > 1 ? 's' : ''} enregistré{pleins.length > 1 ? 's' : ''}
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

      {/* Pleins List */}
      {pleins.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>⛽</Text>
          </View>
          <Text style={styles.emptyTitle}>
            Aucun plein
          </Text>
          <Text style={styles.emptyDescription}>
            Enregistrez vos premiers pleins d'essence pour commencer le suivi.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pleins}
          renderItem={renderPleinItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Plein Modal */}
      <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Nouveau plein</Text>
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
                <Text style={styles.inputLabel}>Véhicule *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={addPlein.vehiculeId}
                    onValueChange={value => setAddPlein({...addPlein, vehiculeId: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="Sélectionner un véhicule..." value="" />
                    {vehicules.map(vehicule => (
                      <Picker.Item 
                        key={vehicule.id} 
                        label={`${vehicule.immatriculation} - ${vehicule.marque} ${vehicule.modele}`} 
                        value={vehicule.id.toString()} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kilométrage précédent *</Text>
                <TextInput
                  value={addPlein.kmPrecedent}
                  onChangeText={text => setAddPlein({...addPlein, kmPrecedent: text})}
                  placeholder="Ex: 50000"
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kilométrage actuel *</Text>
                <TextInput
                  value={addPlein.kmActuel}
                  onChangeText={text => setAddPlein({...addPlein, kmActuel: text})}
                  placeholder="Ex: 50600"
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantité (litres) *</Text>
                <TextInput
                  value={addPlein.quantite}
                  onChangeText={text => setAddPlein({...addPlein, quantite: text})}
                  placeholder="Ex: 45.5"
                  keyboardType="decimal-pad"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Prix du plein (FMG)</Text>
                <TextInput
                  value={addPlein.prixPlein}
                  onChangeText={text => setAddPlein({...addPlein, prixPlein: text})}
                  placeholder="Ex: 65500"
                  keyboardType="decimal-pad"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date et heure *</Text>
                <TextInput
                  value={addPlein.dateHeure}
                  onChangeText={text => setAddPlein({...addPlein, dateHeure: text})}
                  placeholder="YYYY-MM-DDTHH:MM"
                  style={styles.textInput}
                />
                <Text style={styles.helpText}>
                  Format: AAAA-MM-JJTHH:MM (ex: 2024-12-25T14:30)
                </Text>
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
                onPress={ajouterPlein}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Plein Modal */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Modifier plein</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            {editPlein && (
              <View style={styles.formSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Véhicule</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editPlein.vehiculeId}
                      onValueChange={value => setEditPlein({...editPlein, vehiculeId: value})}
                      style={styles.picker}
                    >
                      {vehicules.map(vehicule => (
                        <Picker.Item 
                          key={vehicule.id} 
                          label={`${vehicule.immatriculation} - ${vehicule.marque} ${vehicule.modele}`} 
                          value={vehicule.id.toString()} 
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Kilométrage précédent</Text>
                  <TextInput
                    value={editPlein.kmPrecedent}
                    onChangeText={text => setEditPlein({...editPlein, kmPrecedent: text})}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Kilométrage actuel</Text>
                  <TextInput
                    value={editPlein.kmActuel}
                    onChangeText={text => setEditPlein({...editPlein, kmActuel: text})}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantité (litres)</Text>
                  <TextInput
                    value={editPlein.quantite}
                    onChangeText={text => setEditPlein({...editPlein, quantite: text})}
                    keyboardType="decimal-pad"
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Prix du plein (FMG)</Text>
                  <TextInput
                    value={editPlein.prixPlein}
                    onChangeText={text => setEditPlein({...editPlein, prixPlein: text})}
                    keyboardType="decimal-pad"
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date et heure</Text>
                  <TextInput
                    value={editPlein.dateHeure}
                    onChangeText={text => setEditPlein({...editPlein, dateHeure: text})}
                    style={styles.textInput}
                  />
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
                onPress={modifierPlein}
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.gray600,
  },
  dateContainer: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dateText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsLeft: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.gray600,
  },
  kmContainer: {
    marginLeft: 16,
    alignItems: 'flex-end',
  },
  kmNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gray900,
  },
  kmLabel: {
    fontSize: 12,
    color: colors.gray500,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: colors.red50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: colors.red600,
    fontWeight: '600',
    fontSize: 14,
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
  helpText: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 8,
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
