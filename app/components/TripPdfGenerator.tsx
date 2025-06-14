import React, { useState } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { format } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Trip as TripType } from '../../types/Types';
import { Colors } from '../../constants/Colors';

interface TripPdfGeneratorProps {
  tripId: string;
  tripData: TripType;
}

const TripPdfGenerator: React.FC<TripPdfGeneratorProps> = ({ tripId, tripData }) => {
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const handleDownloadTripInfo = () => {
    const generatePdfFromTripData = async () => {
      try {
        // Show loading indicator or feedback
        setPdfGenerating(true);

        // Use the tripData prop directly since it's already available
        if (tripData) {
          // Log the full trip data with JSON stringify to show nested arrays properly
          console.log("Trip data for PDF generation:");
          console.log(JSON.stringify(tripData, null, 2));

          // Generate HTML content from trip data
          const htmlContent = generateTripHtml(tripData);

          // Create a PDF and save it using expo-print
          await printToPdf(htmlContent, tripData.name);

          return tripData;
        } else {
          console.log("No trip data available");
          Alert.alert("Error", "Could not find trip data");
          setPdfGenerating(false);
          return null;
        }
      } catch (error) {
        console.error("Error generating PDF from trip data:", error);
        Alert.alert("Error", "Failed to download trip information");
        setPdfGenerating(false);
        return null;
      }
    };

    generatePdfFromTripData();
  };

  // Function to generate HTML content from trip data
  const generateTripHtml = (trip: TripType): string => {
    // Create HTML content with styling
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
        <title>${trip.name} Trip Details</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            margin: 0;
            padding: 15px;
            color: #333;
            font-size: 11pt;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          h1, h2, h3 {
            color: #2E8B57;
            margin-top: 0.6em;
            margin-bottom: 0.4em;
          }
          h1 {
            border-bottom: 2px solid #2E8B57;
            padding-bottom: 8px;
          }
          h2 {
            font-size: 1.2em;
          }
          h3 {
            font-size: 1.1em;
          }
          .header {
            display: flex;
            flex-direction: column;
            margin-bottom: 15px;
          }
          .section {
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 12px;
            background-color: #f9f9f9;
          }
          .description-section {
            padding: 10px 12px;
          }
          .description-section p {
            margin: 0;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .detail-item {
            margin-bottom: 6px;
          }
          .detail-label {
            font-weight: bold;
            color: #555;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 0.9em;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .checklist-item {
            margin-bottom: 3px;
          }
          .checklist-item input {
            margin-right: 6px;
          }
          .checklist-item span {
            text-decoration: line-through;
            color: #888;
          }
          ul {
            margin-top: 5px;
            margin-bottom: 5px;
            padding-left: 20px;
          }
          li {
            margin-bottom: 3px;
          }
          p {
            margin: 5px 0;
          }
          @media print {
            body {
              font-size: 10pt;
            }
            .section {
              page-break-inside: avoid;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${trip.name}</h1>
            <p><strong>Location:</strong> ${trip.location}</p>
            ${trip.dateRange ?
        `<p><strong>Dates:</strong> ${trip.dateRange.startDate} to ${trip.dateRange.endDate}</p>` : ''}
          </div>
          
          ${trip.description ? `
          <div class="section description-section">
            <p>${trip.description}</p>
          </div>` : ''}
          
          <div class="section">
            <h2>Trip Details</h2>
            <div class="details-grid">
              ${trip.difficultyLevel ? `
                <div class="detail-item">
                  <div class="detail-label">Difficulty Level:</div>
                  <div>${trip.difficultyLevel}</div>
                </div>` : ''}
              
              ${trip.groupSize ? `
                <div class="detail-item">
                  <div class="detail-label">Group Size:</div>
                  <div>${trip.groupSize}</div>
                </div>` : ''}
              
              ${trip.cellService ? `
                <div class="detail-item">
                  <div class="detail-label">Cell Service:</div>
                  <div>${trip.cellService}</div>
                </div>` : ''}
              
              ${trip.parkContact ? `
                <div class="detail-item">
                  <div class="detail-label">Park Contact:</div>
                  <div>${trip.parkContact}</div>
                </div>` : ''}
              
              ${trip.address ? `
                <div class="detail-item">
                  <div class="detail-label">Park Address:</div>
                  <div>${trip.address}</div>
                </div>` : ''}
              
              ${trip.parkWebsite ? `
                <div class="detail-item">
                  <div class="detail-label">Park Website:</div>
                  <div>${trip.parkWebsite}</div>
                </div>` : ''}
            </div>
          </div>
          
          ${trip.highlights && trip.highlights.length > 0 ? `
            <div class="section">
              <h2>Highlights</h2>
              <ul>
                ${trip.highlights.map(highlight => `<li>${highlight}</li>`).join('')}
              </ul>
            </div>` : ''}
          
          ${trip.amenities && trip.amenities.length > 0 ? `
            <div class="section">
              <h2>Amenities</h2>
              <ul>
                ${trip.amenities.map(amenity => `<li>${amenity}</li>`).join('')}
              </ul>
            </div>` : ''}
          
          ${trip.warnings && trip.warnings.length > 0 ? `
            <div class="section">
              <h2>Warnings</h2>
              <ul>
                ${trip.warnings.map(warning => `<li>${warning}</li>`).join('')}
              </ul>
            </div>` : ''}
          
          ${trip.thingsToKnow && trip.thingsToKnow.length > 0 ? `
            <div class="section">
              <h2>Things to Know</h2>
              <ul>
                ${trip.thingsToKnow.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>` : ''}
          
          ${trip.schedule && trip.schedule.length > 0 ? `
            <div class="section">
              <h2>Schedule</h2>
              ${trip.schedule.map(day => `
                <h3>Day ${day.day} - ${day.date}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${day.activities.map(activity => `
                      <tr>
                        <td>${activity.startTime}</td>
                        <td>${activity.endTime}</td>
                        <td>${activity.activity}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `).join('')}
            </div>` : ''}
          
          ${trip.packingChecklist && trip.packingChecklist.length > 0 ? `
            <div class="section">
              <h2>Packing Checklist</h2>
              <div class="checklist-container">
                ${trip.packingChecklist.map(item => `
                  <div class="checklist-item">
                    <input type="checkbox" ${item.checked ? 'checked' : ''}>
                    ${item.checked ? `<span>${item.item}</span>` : item.item}
                  </div>
                `).join('')}
              </div>
            </div>` : ''}
          
          <div class="footer">
            <p>Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")} by Trekteria</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Function to print to PDF using expo-print
  const printToPdf = async (htmlContent: string, tripName: string) => {
    try {
      // Generate the PDF filename
      const fileName = `Trip_${tripName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;

      // Generate PDF with expo-print
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log('PDF file created at:', uri);

      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (isSharingAvailable) {
        // Share the PDF file
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${tripName} Trip Details`,
        });

        Alert.alert(
          "Success",
          "Your trip details PDF has been created successfully."
        );
      } else {
        Alert.alert(
          "Error",
          "Sharing is not available on this device"
        );
      }

      setPdfGenerating(false);
    } catch (error) {
      console.error("Error printing to PDF:", error);
      Alert.alert("Error", "Failed to create PDF");
      setPdfGenerating(false);
    }
  };

  return (
    <>
      {pdfGenerating && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Preparing your trip document...</Text>
        </View>
      )}
      <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadTripInfo}>
        <Ionicons name="download-outline" size={20} color={Colors.white} />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  downloadButton: {
    position: 'absolute',
    top: '15%',
    right: 20,
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 30,
    boxShadow: '0px 5px 10px 0px rgba(0, 0, 0, 0.3)',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  loadingText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TripPdfGenerator; 