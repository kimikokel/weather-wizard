import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView,
  ActivityIndicator,
  FlatList
} from 'react-native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { API_KEY } from '@env';

export default function WeatherApp() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWeather = async () => {
    if (!city.trim()) {
      setError('Please enter a city 🌍');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
      );
      const forecast = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&cnt=8`
      );
      
      const timezoneOffset = forecast.data.city.timezone;
      
      setWeather({
        current: response.data,
        forecast: forecast.data,
        timezoneOffset
      });
    } catch (err) {
      setError('City not found! Try again 🧐');
    } finally {
      setLoading(false);
    }
  };

  const getLocalTime = (timestamp, timezoneOffset) => {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRainTimes = () => {
    if (!weather?.forecast?.list) return [];
    
    return weather.forecast.list
      .filter(item => 
        item.weather[0].main.toLowerCase().includes('rain') ||
        item.weather[0].description.toLowerCase().includes('rain')
      )
      .map(item => ({
        time: getLocalTime(item.dt, weather.timezoneOffset),
        intensity: item.rain ? item.rain['3h'] || 0 : 0
      }));
  };

  const weatherData = weather && {
    location: weather.current.name,
    currentTemp: weather.current.main.temp,
    avgTemp: weather.forecast.list.reduce((sum, item) => sum + item.main.temp, 0) / weather.forecast.list.length,
    minTemp: Math.min(...weather.forecast.list.map(item => item.main.temp)),
    maxTemp: Math.max(...weather.forecast.list.map(item => item.main.temp)),
    humidity: weather.current.main.humidity,
    description: weather.current.weather[0].description,
    icon: weather.current.weather[0].icon,
    willRain: weather.forecast.list.some(item => 
      item.weather[0].main.toLowerCase().includes('rain') ||
      item.weather[0].description.toLowerCase().includes('rain')
    ),
    rainTimes: getRainTimes(),
    currentTime: getLocalTime(weather.current.dt, weather.timezoneOffset)
  };

  const extremeWeather = weather?.current?.weather[0].main === 'Extreme' || 
    /typhoon|storm|hurricane|tornado|severe/i.test(weather?.current?.weather[0].description);

  const renderRainTime = ({ item }) => (
    <View style={styles.rainTimeItem}>
      <Text style={styles.rainTimeText}>{item.time}</Text>
      <Text style={styles.rainIntensityText}>
        {item.intensity > 0 ? `💧 ${item.intensity.toFixed(1)}mm` : '🌧️'}
      </Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#a8edea', '#fed6e3']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>☀️ Weather Wizard 🌈</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter a city (e.g.,Macau)"
            value={city}
            onChangeText={setCity}
            placeholderTextColor="#888"
          />
          <TouchableOpacity style={styles.button} onPress={fetchWeather}>
            <Text style={styles.buttonText}>Search 🔍</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator size="large" color="#fff" />}
        {error && <Text style={styles.error}>{error}</Text>}

        {weatherData && (
          <View style={styles.weatherCard}>
            <Text style={styles.city}>
              {weatherData.location} {getWeatherEmoji(weather.current.weather[0].main)}
              {/* <Text style={styles.time}> • Local Time: {weatherData.currentTime}</Text> */}
            </Text>
            
            <View style={styles.weatherRow}>
              <Image
                style={styles.weatherIcon}
                source={{
                  uri: `https://openweathermap.org/img/wn/${weatherData.icon}@4x.png`,
                }}
              />
              <View>
                <Text style={styles.temp}>{Math.round(weatherData.currentTemp)}°C</Text>
                <Text style={styles.tempRange}>
                  H: {Math.round(weatherData.maxTemp)}° L: {Math.round(weatherData.minTemp)}°
                </Text>
              </View>
            </View>

            <Text style={styles.description}>
              {weatherData.description.charAt(0).toUpperCase() + weatherData.description.slice(1)}
            </Text>

            <View style={styles.detailsContainer}>
              <Text style={styles.detail}>🌡️ Feels Like: {Math.round(weather.current.main.feels_like)}°C</Text>
              <Text style={styles.detail}>💧 Humidity: {weatherData.humidity}%</Text>
              <Text style={styles.detail}>🌬️ Wind: {weather.current.wind.speed} m/s</Text>
              <Text style={styles.detail}>📊 Avg Temp: {Math.round(weatherData.avgTemp)}°C</Text>
            </View>

            {extremeWeather && (
              <Text style={styles.alert}>⚠️ Warning: {weather.current.weather[0].description.toUpperCase()}!</Text>
            )}

            {weatherData.willRain ? (
              <View style={styles.rainContainer}>
                <Text style={styles.rainHeader}>🌧️ Expected Rain Times:</Text>
                <FlatList
                  data={weatherData.rainTimes}
                  renderItem={renderRainTime}
                  keyExtractor={(item, index) => index.toString()}
                  numColumns={3}
                  columnWrapperStyle={styles.rainTimesGrid}
                  contentContainerStyle={styles.rainTimesContainer}
                />
              </View>
            ) : (
              <Text style={styles.noRain}>☀️ No rain expected today!</Text>
            )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const getWeatherEmoji = (weatherMain) => {
  switch (weatherMain) {
    case 'Rain': return '🌧️';
    case 'Clouds': return '☁️';
    case 'Clear': return '☀️';
    case 'Snow': return '❄️';
    case 'Thunderstorm': return '⚡';
    case 'Extreme': return '⚠️';
    default: return '🌈';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5a5a5a',
    marginBottom: 20,
    marginTop: 50,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    width: '100%',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#ff9a9e',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  error: {
    color: '#ff4757',
    fontSize: 16,
    marginBottom: 20,
  },
  weatherCard: {
    backgroundColor: 'rgba(244, 199, 255, 0.6)',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  city: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#5a5a5a',
    textAlign: 'center',
  },
  time: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#666',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'center',
  },
  weatherIcon: {
    width: 80,
    height: 80,
    marginRight: 10,
  },
  temp: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#5a5a5a',
    textAlign: 'center',
  },
  tempRange: {
    fontSize: 16,
    color: '#5a5a5a',
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: '#5a5a5a',
    marginBottom: 15,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  detailsContainer: {
    width: '100%',
    marginBottom: 15,
  },
  detail: {
    fontSize: 16,
    color: '#5a5a5a',
    marginBottom: 5,
    textAlign: 'center',
  },
  alert: {
    color: '#ff4757',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  noRain: {
    color: 'rgba(255, 89, 56, 0.81)',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  rainContainer: {
    width: '100%',
    marginTop: 10,
  },
  rainHeader: {
    color: '#1e90ff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  rainTimesContainer: {
    justifyContent: 'center',
  },
  rainTimesGrid: {
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  rainTimeItem: {
    backgroundColor: 'rgba(218, 246, 255, 0.5)',
    borderRadius: 8,
    padding: 8,
    margin: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  rainTimeText: {
    color: '#1e90ff',
    fontWeight: 'bold',
  },
  rainIntensityText: {
    color: '#4682b4',
    fontSize: 12,
  },
});