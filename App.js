import React, { useState, useEffect, useMemo, useRef } from 'react'; // ADICIONADO: useRef
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av'; // ADICIONADO: Para suporte a vídeo

// Ícone de Checkbox customizado (sem alterações)
const Checkbox = ({ isChecked, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.checkboxContainer}>
    <View style={[styles.checkboxBase, isChecked && styles.checkboxChecked]}>
      {isChecked && <Text style={styles.checkboxCheckmark}>✓</Text>}
    </View>
  </TouchableOpacity>
);

// ADICIONADO: Componente inteligente para renderizar mídia
const MediaDisplay = ({ uri, style }) => {
  if (!uri) return null;

  // Verifica se a URL é de um vídeo
  const isVideo =
    uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov');

  if (isVideo) {
    return (
      <Video
        source={{ uri }}
        style={style}
        resizeMode={ResizeMode.CONTAIN} // Similar ao objectFit: 'contain'
        isLooping
        isMuted // Vídeos em preview geralmente são mudos
        shouldPlay // Inicia o vídeo automaticamente
      />
    );
  }

  // Para .gif, .png, .jpg, etc., usa o componente Image normal
  return <Image source={{ uri }} style={style} />;
};

const weekDayInitials = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const weekDaysFull = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

export default function App() {
  const [workouts, setWorkouts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState(null);

  // Estado para o formulário no Modal
  const [title, setTitle] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [repeatDays, setRepeatDays] = useState([]);
  const [mediaUrl, setMediaUrl] = useState(''); // ALTERADO: de imageUrl para mediaUrl para clareza

  // Carregar e Salvar (pequena alteração no nome da propriedade)
  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const storedWorkouts = await AsyncStorage.getItem('@workouts');
        if (storedWorkouts !== null) {
          setWorkouts(JSON.parse(storedWorkouts));
        }
      } catch (e) {
        console.error('Falha ao carregar os treinos.', e);
      }
    };
    loadWorkouts();
  }, []);

  useEffect(() => {
    const saveWorkouts = async () => {
      try {
        await AsyncStorage.setItem('@workouts', JSON.stringify(workouts));
      } catch (e) {
        console.error('Falha ao salvar os treinos.', e);
      }
    };
    saveWorkouts();
  }, [workouts]);

  const days = useMemo(() => {
    const dayArray = [];
    for (let i = -1; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dayArray.push(date);
    }
    return dayArray;
  }, []);

  const selectedDayOfWeek = selectedDate.getDay();
  const filteredWorkouts = useMemo(() => {
    return workouts.filter((workout) =>
      workout.repeatDays.includes(selectedDayOfWeek)
    );
  }, [workouts, selectedDayOfWeek]);

  // Funções de manipulação (alterações nos nomes das variáveis)
  const handleOpenModal = (workout = null) => {
    if (workout) {
      setIsEditing(true);
      setCurrentWorkout(workout);
      setTitle(workout.title);
      setSets(workout.sets);
      setReps(workout.reps);
      setRepeatDays(workout.repeatDays);
      setMediaUrl(workout.mediaUrl || ''); // ALTERADO
    } else {
      setIsEditing(false);
      setCurrentWorkout(null);
      setTitle('');
      setSets('');
      setReps('');
      setRepeatDays([]);
      setMediaUrl(''); // ALTERADO
    }
    setModalVisible(true);
  };

  const handleSaveWorkout = () => {
    if (!title || repeatDays.length === 0) {
      Alert.alert(
        'Erro',
        'Título e pelo menos um dia de repetição são obrigatórios.'
      );
      return;
    }
    const workoutData = { title, sets, reps, repeatDays, mediaUrl }; // ALTERADO
    if (isEditing) {
      const updatedWorkouts = workouts.map((w) =>
        w.id === currentWorkout.id ? { ...w, ...workoutData } : w
      );
      setWorkouts(updatedWorkouts);
    } else {
      const newWorkout = {
        id: Date.now().toString(),
        ...workoutData,
        completedOn: [],
      };
      setWorkouts([...workouts, newWorkout]);
    }
    setModalVisible(false);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de permissão para acessar sua galeria.'
      );
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      // ALTERADO: Adicionado 'Videos' para permitir seleção de vídeos da galeria
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
    });
    if (!result.canceled) {
      setMediaUrl(result.assets[0].uri); // ALTERADO
    }
  };

  const handleDeleteWorkout = (id) => {
    Alert.alert('Deletar Treino', 'Você tem certeza?', [
      { text: 'Cancelar' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: () => {
          setWorkouts(workouts.filter((workout) => workout.id !== id));
        },
      },
    ]);
  };

  const toggleWorkoutComplete = (workoutId) => {
    const dateString = selectedDate.toISOString().split('T')[0];
    const updatedWorkouts = workouts.map((workout) => {
      if (workout.id === workoutId) {
        const completedOn = [...workout.completedOn];
        const dateIndex = completedOn.indexOf(dateString);
        if (dateIndex > -1) {
          completedOn.splice(dateIndex, 1);
        } else {
          completedOn.push(dateString);
        }
        return { ...workout, completedOn };
      }
      return workout;
    });
    setWorkouts(updatedWorkouts);
  };

  const toggleRepeatDay = (dayIndex) => {
    setRepeatDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Meu Treino</Text>

      {/* Seletor de Dias (sem alterações) */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10 }}>
          {days.map((day, index) => {
            const isSelected =
              day.toDateString() === selectedDate.toDateString();
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  isSelected && styles.selectedDayButton,
                ]}
                onPress={() => setSelectedDate(day)}>
                <Text
                  style={[styles.dayText, isSelected && styles.selectedText]}>
                  {day
                    .toLocaleDateString('pt-BR', { weekday: 'short' })
                    .substring(0, 3)
                    .toUpperCase()}
                </Text>
                <Text
                  style={[styles.dateText, isSelected && styles.selectedText]}>
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista de Treinos */}
      <FlatList
        data={filteredWorkouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isCompletedToday = item.completedOn.includes(
            selectedDate.toISOString().split('T')[0]
          );
          return (
            <TouchableOpacity onPress={() => handleOpenModal(item)}>
              <View
                style={[styles.card, isCompletedToday && styles.cardCompleted]}>
                {/* ALTERADO: Usando o novo componente MediaDisplay */}
                <MediaDisplay uri={item.mediaUrl} style={styles.cardImage} />

                {/* Conteúdo do card (checkbox, texto, etc.) */}
                <View style={styles.cardContent}>
                  <Checkbox
                    isChecked={isCompletedToday}
                    onPress={() => toggleWorkoutComplete(item.id)}
                  />
                  <View style={styles.textContainer}>
                    <Text
                      style={[
                        styles.title,
                        isCompletedToday && styles.textCompleted,
                      ]}>
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.description,
                        isCompletedToday && styles.textCompleted,
                      ]}>
                      {item.sets && item.reps
                        ? `${item.sets}x${item.reps}`
                        : item.sets || item.reps}
                    </Text>
                    <View style={styles.repeatDaysContainer}>
                      {item.repeatDays
                        .sort((a, b) => a - b)
                        .map((dayIndex) => (
                          <View key={dayIndex} style={styles.repeatDayBubble}>
                            <Text style={styles.repeatDayText}>
                              {weekDayInitials[dayIndex]}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteWorkout(item.id)}
                    style={styles.deleteButton}>
                    <Text style={{ color: '#ff5555', fontSize: 20 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text
            style={{
              color: '#aaa',
              textAlign: 'center',
              marginTop: 50,
              fontSize: 16,
            }}>
            Nenhum treino para hoje!
          </Text>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* FAB e Modal (sem alterações) */}
      <TouchableOpacity style={styles.fab} onPress={() => handleOpenModal()}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'flex-end',
              }}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Editar Treino' : 'Adicionar Treino'}
                </Text>

                {/* ALTERADO: Usando MediaDisplay para o preview no modal */}
                <MediaDisplay uri={mediaUrl} style={styles.modalImagePreview} />

                <TextInput
                  style={styles.input}
                  // ALTERADO: Placeholder mais claro
                  placeholder="Link da imagem/GIF/vídeo (.mp4)"
                  placeholderTextColor="#666"
                  value={mediaUrl}
                  onChangeText={setMediaUrl}
                />
                <TouchableOpacity
                  style={styles.galleryButton}
                  onPress={handlePickImage}>
                  <Text style={styles.galleryButtonText}>
                    Escolher da Galeria
                  </Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Ex: Supino Reto"
                  placeholderTextColor="#666"
                  value={title}
                  onChangeText={setTitle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Séries (Ex: 4)"
                  placeholderTextColor="#666"
                  value={sets}
                  onChangeText={setSets}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Repetições (Ex: 12)"
                  placeholderTextColor="#666"
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="numeric"
                />

                <Text style={styles.weekDayLabel}>Repetir na semana:</Text>
                <View style={styles.weekDaySelector}>
                  {weekDaysFull.map((dayName, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.weekDayButton,
                        repeatDays.includes(index) &&
                          styles.weekDayButtonSelected,
                      ]}
                      onPress={() => toggleRepeatDay(index)}>
                      <Text
                        style={[
                          styles.weekDayText,
                          repeatDays.includes(index) &&
                            styles.weekDayTextSelected,
                        ]}>
                        {weekDayInitials[index]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancel}
                    onPress={() => setModalVisible(false)}>
                    <Text style={styles.buttonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.save}
                    onPress={handleSaveWorkout}>
                    <Text style={styles.buttonText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Estilos (sem grandes alterações, apenas renomeei um estilo para clareza)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191b1e',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 70,
    borderRadius: 80,
    backgroundColor: '#1f232a',
    marginHorizontal: 5,
  },
  selectedDayButton: {
    backgroundColor: '#694aff',
  },
  dayText: {
    fontSize: 14,
    color: '#888',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedText: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 0,
    paddingBottom: 160,
  },
  card: {
    backgroundColor: '#1f232a',
    borderRadius: 20,
    marginVertical: 8,
    marginHorizontal: 20,
    borderColor: '#25242f',
    borderWidth: 2,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardCompleted: {
    backgroundColor: '#24273b',
    borderColor: '#514c7a',
  },
  cardImage: {
    // Este estilo agora se aplica tanto a Imagem quanto a Vídeo
    width: '100%',
    height: 250,
    backgroundColor: '#191b1e', // Cor de fundo enquanto o vídeo carrega
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  checkboxContainer: {
    paddingRight: 15,
  },
  checkboxBase: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#694aff',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#694aff',
  },
  checkboxCheckmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ccc',
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 4,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: '#777',
  },
  repeatDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  repeatDayBubble: {
    backgroundColor: '#3a3d54',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  repeatDayText: {
    color: '#b0b3d1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 30,
    bottom: 80,
    backgroundColor: '#6949fd',
    borderTopRightRadius: 40,
    borderTopLeftRadius: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 30,
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContainer: {
    backgroundColor: '#191b1e',
    padding: 20,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalImagePreview: {
    // Este estilo agora se aplica tanto a Imagem quanto a Vídeo
    width: '90%',
    height: 200, // Altura para o preview no modal
    alignSelf: 'center',
    borderRadius: 15,
    marginBottom: 15,
    backgroundColor: '#1f232a',
  },
  galleryButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#1f232a',
    borderWidth: 2,
    borderColor: '#2f313a',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#ddd',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 'auto',
    paddingTop: 20,
    paddingBottom: 20,
  },
  save: {
    width: 120,
    height: 60,
    backgroundColor: '#6d4ffc',
    borderColor: '#5643ba',
    borderWidth: 4,
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    width: 120,
    height: 60,
    backgroundColor: '#fe6367',
    borderColor: '#d67782',
    borderWidth: 4,
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekDayLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  weekDaySelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  weekDayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f232a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2f313a',
  },
  weekDayButtonSelected: {
    backgroundColor: '#694aff',
    borderColor: '#8e79ff',
  },
  weekDayText: {
    color: '#aaa',
    fontWeight: 'bold',
  },
  weekDayTextSelected: {
    color: '#fff',
  },
});
