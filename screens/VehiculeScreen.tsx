import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, FlatList, TouchableOpacity, Modal, BackHandler } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Picker } from '@react-native-picker/picker';

let db: SQLite.SQLiteDatabase | null = null;

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
    // Charger les essences pour le picker
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
      // Synchronise la liste des essences après ajout
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
      // Synchronise la liste des essences après modification
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

  // Synchronisation globale des essences pour les autres écrans
  useEffect(() => {
    (globalThis as any).syncEssences = () => {
      if (!db) return;
      db.getAllAsync('SELECT * FROM TypeEssence').then(setEssences).catch(() => setEssences([]));
    };
  }, [dbReady]);

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.title}>Liste des véhicules</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addBtn}>
          <Text style={{ fontSize: 28, color: 'green' }}>+</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={vehicules}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text>Immatriculation : {item.immatriculation}</Text>
              <Text>Marque : {item.marque}</Text>
              <Text>Modèle : {item.modele}</Text>
              <Text>Année : {item.annee}</Text>
              <Text>Type d'essence : {essences.find(e => e.id === item.type_essence_id)?.nom ?? ''}</Text>
            </View>
            <TouchableOpacity onPress={() => ouvrirEdition(item)} style={styles.actionBtn}>
              <Text style={{ color: 'blue' }}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => supprimerVehicule(item.id)} style={styles.actionBtn}>
              <Text style={{ color: 'red' }}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {/* Modal d'ajout */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Ajouter un véhicule</Text>
            <TextInput
              style={styles.input}
              placeholder="Immatriculation"
              value={addVehicule.immatriculation}
              onChangeText={text => setAddVehicule(v => ({ ...v, immatriculation: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Marque"
              value={addVehicule.marque}
              onChangeText={text => setAddVehicule(v => ({ ...v, marque: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Modèle"
              value={addVehicule.modele}
              onChangeText={text => setAddVehicule(v => ({ ...v, modele: text }))}
            />
            <Text style={styles.label}>Année :</Text>
            <Picker
              selectedValue={addVehicule.annee}
              onValueChange={val => setAddVehicule(v => ({ ...v, annee: val }))}
              style={styles.input}
            >
              {years.map(y => (
                <Picker.Item key={y} label={y.toString()} value={y.toString()} />
              ))}
            </Picker>
            <Text style={styles.label}>Type d'essence :</Text>
            <Picker
              selectedValue={addVehicule.type_essence_id}
              onValueChange={val => setAddVehicule(v => ({ ...v, type_essence_id: val }))}
              style={styles.input}
            >
              <Picker.Item label="Choisir..." value="" />
              {essences.map(e => (
                <Picker.Item key={e.id} label={e.nom} value={e.id.toString()} />
              ))}
            </Picker>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button title="Annuler" onPress={() => setAddModalVisible(false)} />
              <Button title="Ajouter" onPress={ajouterVehicule} />
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal d'édition */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Modifier le véhicule</Text>
            <TextInput
              style={styles.input}
              placeholder="Immatriculation"
              value={editVehicule?.immatriculation}
              onChangeText={text => setEditVehicule((v: any) => ({ ...v, immatriculation: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Marque"
              value={editVehicule?.marque}
              onChangeText={text => setEditVehicule((v: any) => ({ ...v, marque: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Modèle"
              value={editVehicule?.modele}
              onChangeText={text => setEditVehicule((v: any) => ({ ...v, modele: text }))}
            />
            <Text style={styles.label}>Année :</Text>
            <Picker
              selectedValue={editVehicule?.annee?.toString()}
              onValueChange={val => setEditVehicule((v: any) => ({ ...v, annee: val }))}
              style={styles.input}
            >
              {years.map(y => (
                <Picker.Item key={y} label={y.toString()} value={y.toString()} />
              ))}
            </Picker>
            <Text style={styles.label}>Type d'essence :</Text>
            <Picker
              selectedValue={editVehicule?.type_essence_id?.toString()}
              onValueChange={val => setEditVehicule((v: any) => ({ ...v, type_essence_id: val }))}
              style={styles.input}
            >
              <Picker.Item label="Choisir..." value="" />
              {essences.map(e => (
                <Picker.Item key={e.id} label={e.nom} value={e.id.toString()} />
              ))}
            </Picker>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button title="Annuler" onPress={() => setEditModalVisible(false)} />
              <Button title="Enregistrer" onPress={modifierVehicule} />
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
  actionBtn: {
    marginLeft: 8,
  },
  addBtn: {
    marginLeft: 8,
    backgroundColor: '#e6ffe6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 2,
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
