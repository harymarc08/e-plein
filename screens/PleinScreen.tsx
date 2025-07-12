import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, FlatList, TouchableOpacity, Modal, BackHandler } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as SQLite from 'expo-sqlite';
import { useIsFocused } from '@react-navigation/native';

let db: SQLite.SQLiteDatabase | null = null;

export default function PleinScreen() {
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [essences, setEssences] = useState<any[]>([]);
  const [pleins, setPleins] = useState<any[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  // Ajoute le champ prixPlein dans le state d'ajout
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

  const fetchPleins = async () => {
    if (!db) return;
    try {
      const result = await db.getAllAsync(`SELECT CarburantEntree.*, Vehicule.immatriculation, TypeEssence.nom as essence_nom FROM CarburantEntree
        JOIN Vehicule ON CarburantEntree.vehicule_id = Vehicule.id
        JOIN TypeEssence ON Vehicule.type_essence_id = TypeEssence.id
        ORDER BY date_heure DESC`);
      setPleins(result);
    } catch (e) {
      setPleins([]);
    }
  };

  // Récupère le prix au litre du type d'essence du véhicule sélectionné (tarif le plus récent pour ce nom)
  const getPrixParLitre = (vehiculeId: string) => {
    const vehicule = vehicules.find(v => v.id.toString() === vehiculeId);
    if (!vehicule) return 0;
    // On récupère le nom d'essence du véhicule
    const essenceVehicule = essences.find(e => e.id === vehicule.type_essence_id);
    if (!essenceVehicule) return 0;
    // On cherche le prix le plus récent pour ce nom d'essence
    const essencesMemeNom = essences.filter(e => e.nom === essenceVehicule.nom);
    if (essencesMemeNom.length === 0) return 0;
    // Tri décroissant par date_validite
    essencesMemeNom.sort((a, b) => b.date_validite.localeCompare(a.date_validite));
    return essencesMemeNom[0].prix_par_litre;
  };

  const enregistrerPlein = async () => {
    const { vehiculeId, kmPrecedent, kmActuel, quantite, prixPlein, dateHeure } = addPlein;
    if (!vehiculeId || !kmPrecedent || !kmActuel || (!quantite && !prixPlein)) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires');
      return;
    }
    if (!db) return;
    try {
      await db.runAsync(
        'INSERT INTO CarburantEntree (vehicule_id, date_heure, km_precedent, km_actuel, quantite_litres, prix_plein) VALUES (?, ?, ?, ?, ?, ?)',
        [vehiculeId, dateHeure, parseInt(kmPrecedent), parseInt(kmActuel), parseFloat(quantite), parseFloat(prixPlein)]
      );
      setAddPlein({ vehiculeId: '', kmPrecedent: '', kmActuel: '', quantite: '', prixPlein: '', dateHeure: new Date().toISOString().slice(0, 16) });
      setAddModalVisible(false);
      fetchPleins();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const ouvrirEdition = (plein: any) => {
    // On récupère le véhicule associé pour retrouver le type d'essence
    const vehicule = vehicules.find(v => v.id === plein.vehicule_id);
    setEditPlein({
      id: plein.id,
      vehiculeId: plein.vehicule_id?.toString() ?? '',
      essenceId: vehicule?.type_essence_id?.toString() ?? '',
      kmPrecedent: plein.km_precedent?.toString() ?? '',
      kmActuel: plein.km_actuel?.toString() ?? '',
      quantite: plein.quantite_litres?.toString() ?? '',
      dateHeure: plein.date_heure?.slice(0, 16) ?? ''
    });
    setEditModalVisible(true);
  };

  const modifierPlein = async () => {
    if (!db || !editPlein) return;
    const { id, vehiculeId, essenceId, kmPrecedent, kmActuel, quantite, dateHeure } = editPlein;
    if (!vehiculeId || !essenceId || !kmPrecedent || !kmActuel || !quantite) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires');
      return;
    }
    try {
      await db.runAsync(
        'UPDATE CarburantEntree SET vehicule_id = ?, type_essence_id = ?, date_heure = ?, km_precedent = ?, km_actuel = ?, quantite_litres = ? WHERE id = ?',
        [vehiculeId, essenceId, dateHeure, parseInt(kmPrecedent), parseInt(kmActuel), parseFloat(quantite), id]
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

  // Ajout d'une fonction publique pour synchroniser depuis l'extérieur
  (globalThis as any).syncPleinsVehiculesEssences = () => {
    if (!db) return;
    db.getAllAsync('SELECT * FROM Vehicule').then(setVehicules).catch(() => setVehicules([]));
    db.getAllAsync('SELECT * FROM TypeEssence').then(setEssences).catch(() => setEssences([]));
  };

  // Lors du changement de véhicule dans l'ajout de plein, on récupère le dernier km_actuel pour pré-remplir kmPrecedent
  const handleVehiculeChange = async (vehiculeId: string) => {
    setAddPlein(v => ({ ...v, vehiculeId }));
    if (!db || !vehiculeId) {
      setAddPlein(v => ({ ...v, kmPrecedent: '0' }));
      return;
    }
    try {
      const res = await db.getFirstAsync(
        'SELECT km_actuel FROM CarburantEntree WHERE vehicule_id = ? ORDER BY date_heure DESC LIMIT 1',
        [vehiculeId]
      );
      // Correction d'accès à la propriété km_actuel
      const kmActuel = res && (res as any)["km_actuel"] !== undefined ? String((res as any)["km_actuel"]) : '0';
      setAddPlein(v => ({ ...v, kmPrecedent: kmActuel }));
    } catch {
      setAddPlein(v => ({ ...v, kmPrecedent: '0' }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.title}>Liste des pleins</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addBtn}>
          <Text style={{ fontSize: 28, color: 'green' }}>+</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={pleins}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text>Immatriculation : {item.immatriculation}</Text>
              <Text>Date/Heure : {item.date_heure ? new Date(item.date_heure).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</Text>
              <Text>Km précédent : {item.km_precedent}</Text>
              <Text>Km actuel : {item.km_actuel}</Text>
              <Text>Quantité (L) : {item.quantite_litres}</Text>
              <Text>Prix plein : {item.prix_plein}</Text>
            </View>
            <TouchableOpacity onPress={() => ouvrirEdition(item)} style={styles.actionBtn}>
              <Text style={{ color: 'blue' }}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => supprimerPlein(item.id)} style={styles.actionBtn}>
              <Text style={{ color: 'red' }}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {/* Modal d'ajout */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Ajouter un plein</Text>
            <Text style={styles.label}>Véhicule :</Text>
            <Picker
              selectedValue={addPlein.vehiculeId}
              onValueChange={handleVehiculeChange}
              style={styles.input}
            >
              <Picker.Item label="Choisir..." value="" />
              {vehicules.map(v => (
                <Picker.Item key={v.id} label={v.immatriculation} value={v.id.toString()} />
              ))}
            </Picker>
            <TextInput
              style={styles.input}
              placeholder="Km précédent"
              value={addPlein.kmPrecedent}
              onChangeText={text => setAddPlein(v => ({ ...v, kmPrecedent: text }))}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Km actuel"
              value={addPlein.kmActuel}
              onChangeText={text => setAddPlein(v => ({ ...v, kmActuel: text }))}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Quantité (L)"
              value={addPlein.quantite}
              onChangeText={text => {
                setAddPlein(v => {
                  const prixLitre = getPrixParLitre(v.vehiculeId);
                  const quantite = parseFloat(text);
                  return {
                    ...v,
                    quantite: text,
                    prixPlein: prixLitre && !isNaN(quantite) ? (quantite * prixLitre).toFixed(2) : ''
                  };
                });
              }}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Prix du plein (MGA)"
              value={addPlein.prixPlein}
              onChangeText={text => {
                setAddPlein(v => {
                  const prixLitre = getPrixParLitre(v.vehiculeId);
                  const prix = parseFloat(text);
                  return {
                    ...v,
                    prixPlein: text,
                    quantite: prixLitre && !isNaN(prix) ? (prix / prixLitre).toFixed(2) : ''
                  };
                });
              }}
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button title="Annuler" onPress={() => setAddModalVisible(false)} />
              <Button title="Ajouter" onPress={enregistrerPlein} />
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal d'édition */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Modifier le plein</Text>
            <Text style={styles.label}>Véhicule :</Text>
            <Picker
              selectedValue={editPlein?.vehiculeId}
              onValueChange={val => setEditPlein((v: any) => ({ ...v, vehiculeId: val }))}
              style={styles.input}
            >
              <Picker.Item label="Choisir..." value="" />
              {vehicules.map(v => (
                <Picker.Item key={v.id} label={v.immatriculation} value={v.id.toString()} />
              ))}
            </Picker>
            <Text style={styles.label}>Type d'essence :</Text>
            <Picker
              selectedValue={editPlein?.essenceId}
              onValueChange={val => setEditPlein((v: any) => ({ ...v, essenceId: val }))}
              style={styles.input}
            >
              <Picker.Item label="Choisir..." value="" />
              {essences.map(e => (
                <Picker.Item key={e.id} label={e.nom} value={e.id.toString()} />
              ))}
            </Picker>
            <TextInput
              style={styles.input}
              placeholder="Km précédent"
              value={editPlein?.kmPrecedent}
              onChangeText={text => setEditPlein((v: any) => ({ ...v, kmPrecedent: text }))}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Km actuel"
              value={editPlein?.kmActuel}
              onChangeText={text => setEditPlein((v: any) => ({ ...v, kmActuel: text }))}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Quantité (L)"
              value={editPlein?.quantite}
              onChangeText={text => setEditPlein((v: any) => ({ ...v, quantite: text }))}
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button title="Annuler" onPress={() => setEditModalVisible(false)} />
              <Button title="Enregistrer" onPress={modifierPlein} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginVertical: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  label: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addBtn: {
    marginLeft: 8,
    backgroundColor: '#e6ffe6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  actionBtn: {
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
});
