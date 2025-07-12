import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, FlatList, TouchableOpacity, Modal, BackHandler } from 'react-native';
import db from '../db';

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
      // Ajout du nouveau type d'essence
      await db.runAsync(
        'INSERT INTO TypeEssence (nom, prix_par_litre, date_validite) VALUES (?, ?, ?)',
        [addEssence.nom, parseFloat(addEssence.prix), addEssence.date]
      );
      // Récupère l'id du type d'essence le plus récent pour ce nom
      const res = await db.getFirstAsync(
        'SELECT id FROM TypeEssence WHERE nom = ? ORDER BY date_validite DESC LIMIT 1',
        [addEssence.nom]
      );
      const essenceId = res && (res as any)["id"] !== undefined ? (res as any)["id"] : undefined;
      if (essenceId) {
        // Met à jour tous les véhicules ayant ce nom d'essence pour pointer vers ce nouvel id
        await db.runAsync(
          'UPDATE Vehicule SET type_essence_id = ? WHERE type_essence_id IN (SELECT id FROM TypeEssence WHERE nom = ?)', 
          [essenceId, addEssence.nom]
        );
      }
      setAddEssence({ nom: '', prix: '', date: new Date().toISOString().slice(0, 10) });
      setAddModalVisible(false);
      fetchEssences();
      // Synchronise les options dans l'ajout véhicule
      if (globalThis.syncEssences) globalThis.syncEssences();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const supprimerEssence = async (id: number) => {
    // On récupère d'abord le nom de l'essence à supprimer
    let essenceNom = '';
    try {
      const res = await db.getFirstAsync('SELECT nom FROM TypeEssence WHERE id = ?', [id]);
      if (res && (res as any)["nom"]) essenceNom = (res as any)["nom"];
    } catch {}
    Alert.alert(
      'Confirmation',
      "Voulez-vous vraiment supprimer ce prix d'essence ?",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
            if (!db) return;
            try {
              await db.runAsync('DELETE FROM TypeEssence WHERE id = ?', [id]);
              // Après suppression, cherche le nouvel id le plus récent pour ce nom
              if (essenceNom) {
                const res2 = await db.getFirstAsync('SELECT id FROM TypeEssence WHERE nom = ? ORDER BY date_validite DESC LIMIT 1', [essenceNom]);
                const newId = res2 && (res2 as any)["id"] !== undefined ? (res2 as any)["id"] : undefined;
                if (newId) {
                  await db.runAsync('UPDATE Vehicule SET type_essence_id = ? WHERE type_essence_id = ?', [newId, id]);
                }
              }
              fetchEssences();
              // Synchronise les options dans l'ajout véhicule
              if (globalThis.syncEssences) globalThis.syncEssences();
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

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.title}>Historique des prix</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addBtn}>
          <Text style={{ fontSize: 28, color: 'green' }}>+</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={essences}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={{ flex: 1 }}>{item.nom} - {item.prix_par_litre} MGA (depuis {item.date_validite})</Text>
            <TouchableOpacity onPress={() => supprimerEssence(item.id)} style={styles.actionBtn}>
              <Text style={{ color: 'red' }}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {/* Modal d'ajout */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Ajouter un prix d'essence</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom (ex: Essence 95)"
              value={addEssence.nom}
              onChangeText={text => setAddEssence(v => ({ ...v, nom: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Prix par litre (MGA)"
              value={addEssence.prix}
              onChangeText={text => setAddEssence(v => ({ ...v, prix: text }))}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Date de validité (AAAA-MM-JJ)"
              value={addEssence.date}
              onChangeText={text => setAddEssence(v => ({ ...v, date: text }))}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button title="Annuler" onPress={() => setAddModalVisible(false)} />
              <Button title="Ajouter" onPress={ajouterEssence} />
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
