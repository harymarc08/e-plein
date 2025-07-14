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
  StyleSheet 
} from 'react-native';
import db from '../db';

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

declare global {
  // eslint-disable-next-line no-var
  var syncEssences: (() => void) | undefined;
}

export default function EssenceScreen() {
  const [essences, setEssences] = useState<any[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addEssence, setAddEssence] = useState({
    nom: '', prix: '', date: new Date().toISOString().slice(0, 10)
  });

  const fetchEssences = async () => {
    if (!db) return;
    try {
      const result = await db.getAllAsync('SELECT * FROM TypeEssence ORDER BY date_validite DESC');
      setEssences(result);
    } catch (e) {
      setEssences([]);
    }
  };

  useEffect(() => {
    fetchEssences();
  }, []);

  const ajouterEssence = async () => {
    if (!addEssence.nom || !addEssence.prix || !addEssence.date) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires');
      return;
    }
    if (!db) return;
    try {
      await db.runAsync(
        'INSERT INTO TypeEssence (nom, prix_par_litre, date_validite) VALUES (?, ?, ?)',
        [addEssence.nom, parseFloat(addEssence.prix), addEssence.date]
      );
      const res = await db.getFirstAsync(
        'SELECT id FROM TypeEssence WHERE nom = ? ORDER BY date_validite DESC LIMIT 1',
        [addEssence.nom]
      );
      const essenceId = res && (res as any)["id"] !== undefined ? (res as any)["id"] : undefined;
      if (essenceId) {
        await db.runAsync(
          'UPDATE Vehicule SET type_essence_id = ? WHERE type_essence_id IN (SELECT id FROM TypeEssence WHERE nom = ?)', 
          [essenceId, addEssence.nom]
        );
      }
      setAddEssence({ nom: '', prix: '', date: new Date().toISOString().slice(0, 10) });
      setAddModalVisible(false);
      fetchEssences();
      if (global.syncEssences) global.syncEssences();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const supprimerEssence = async (id: number) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer ce type d\'essence ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
            if (!db) return;
            try {
              await db.runAsync('DELETE FROM TypeEssence WHERE id = ?', [id]);
              fetchEssences();
              if (global.syncEssences) global.syncEssences();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  const renderEssenceItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>
              {item.nom}
            </Text>
            <Text style={styles.cardSubtitle}>
              Valide depuis le {formatDate(item.date_validite)}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceValue}>
              {parseFloat(item.prix_par_litre).toFixed(2)} FMG
            </Text>
            <Text style={styles.priceLabel}>
              par litre
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => supprimerEssence(item.id)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>
              🗑️ Supprimer
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
              Types d'Essence
            </Text>
            <Text style={styles.headerSubtitle}>
              {essences.length} type{essences.length > 1 ? 's' : ''} d'essence
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

      {/* Essence List */}
      {essences.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>⛽</Text>
          </View>
          <Text style={styles.emptyTitle}>
            Aucun type d'essence
          </Text>
          <Text style={styles.emptyDescription}>
            Ajoutez un premier type d'essence pour commencer la gestion des prix.
          </Text>
        </View>
      ) : (
        <FlatList
          data={essences}
          renderItem={renderEssenceItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Essence Modal */}
      <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Nouveau type d'essence</Text>
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
                <Text style={styles.inputLabel}>Nom du type d'essence *</Text>
                <TextInput
                  value={addEssence.nom}
                  onChangeText={text => setAddEssence({...addEssence, nom: text})}
                  placeholder="Ex: Sans plomb 95, Diesel..."
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Prix par litre (FMG) *</Text>
                <TextInput
                  value={addEssence.prix}
                  onChangeText={text => setAddEssence({...addEssence, prix: text})}
                  placeholder="Ex: 1450"
                  keyboardType="decimal-pad"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date de validité *</Text>
                <TextInput
                  value={addEssence.date}
                  onChangeText={text => setAddEssence({...addEssence, date: text})}
                  placeholder="YYYY-MM-DD"
                  style={styles.textInput}
                />
                <Text style={styles.helpText}>
                  Format: AAAA-MM-JJ (ex: 2024-12-25)
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
                onPress={ajouterEssence}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Ajouter</Text>
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
    marginBottom: 16,
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
    color: colors.gray500,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.gray500,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
