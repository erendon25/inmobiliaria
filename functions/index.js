const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

/**
 * Notify users when a new property matches their saved alerts.
 */
exports.notifyNewProperty = functions.firestore
    .document("properties/{propertyId}")
    .onCreate(async (snap, context) => {
        const property = snap.data();
        const propertyId = context.params.propertyId;

        // Skip drafts
        if (property.status === "borrador") return null;

        console.log(`Processing new property: ${propertyId}`);

        try {
            // In a production app with many users, we would use a more scalable query.
            // For this project, we iterate users with alerts.
            const usersSnapshot = await db.collection("users").get();
            const notifications = [];

            usersSnapshot.forEach((userDoc) => {
                const userData = userDoc.data();
                const alert = userData.alerts;
                const fcmTokens = userData.fcmTokens;

                if (alert && fcmTokens && fcmTokens.length > 0) {
                    // Match logic
                    let isMatch = true;

                    if (alert.type && property.type && alert.type.toLowerCase() !== property.type.toLowerCase()) {
                        isMatch = false;
                    }

                    if (alert.category && property.category) {
                        const aCat = alert.category.toLowerCase();
                        const pCat = property.category.toLowerCase();
                        
                        // Handle "construido" (Casa or Departamento)
                        if (aCat === "construido") {
                            if (pCat !== "casa" && pCat !== "departamento") {
                                isMatch = false;
                            }
                        } else if (aCat !== pCat) {
                            isMatch = false;
                        }
                    }

                    if (alert.minPrice && property.price && Number(property.price) < Number(alert.minPrice)) {
                        isMatch = false;
                    }

                    if (alert.maxPrice && property.price && Number(property.price) > Number(alert.maxPrice)) {
                        isMatch = false;
                    }

                    if (alert.location && property.location && !property.location.toLowerCase().includes(alert.location.toLowerCase())) {
                        isMatch = false;
                    }

                    if (isMatch) {
                        console.log(`Match found for user ${userDoc.id}`);
                        const message = {
                            notification: {
                                title: "🏠 ¡Nueva propiedad para ti!",
                                body: `Se ha publicado: ${property.title} en ${property.location}.`,
                            },
                            data: {
                                propertyId: propertyId,
                                type: "new_property"
                            },
                            tokens: fcmTokens
                        };
                        notifications.push(admin.messaging().sendMulticast(message));
                    }
                }
            });

            const results = await Promise.all(notifications);
            console.log(`Sent ${results.length} notification batches`);
            return null;
        } catch (error) {
            console.error("Error in notifyNewProperty:", error);
            return null;
        }
    });

/**
 * Notify the agent when their property is viewed.
 */
exports.notifyPropertyViewed = functions.firestore
    .document("properties/{propertyId}")
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        const propertyId = context.params.propertyId;

        // Check if views increased
        if ((newData.views || 0) > (oldData.views || 0)) {
            const agentId = newData.agentId;
            if (!agentId) return null;

            try {
                const agentDoc = await db.collection("users").doc(agentId).get();
                const agentData = agentDoc.data();

                if (agentData && agentData.fcmTokens && agentData.fcmTokens.length > 0) {
                    const message = {
                        notification: {
                            title: "👀 ¡Nueva visita!",
                            body: `Alguien ha visto tu propiedad: ${newData.title}`,
                        },
                        data: {
                            propertyId: propertyId,
                            type: "property_viewed"
                        },
                        tokens: agentData.fcmTokens
                    };
                    await admin.messaging().sendMulticast(message);
                    console.log(`Viewed notification sent to agent ${agentId}`);
                }
                return null;
            } catch (error) {
                console.error("Error in notifyPropertyViewed:", error);
                return null;
            }
        }
        return null;
    });

/**
 * Notify the agent when someone saves their property as favorite.
 */
exports.notifyPropertyFavorited = functions.firestore
    .document("users/{userId}")
    .onUpdate(async (change, context) => {
        const newUserData = change.after.data();
        const oldUserData = change.before.data();

        const newFavs = newUserData.favorites || [];
        const oldFavs = oldUserData.favorites || [];

        // Find strictly added favorites
        const addedIds = newFavs.filter(id => !oldFavs.includes(id));
        if (addedIds.length === 0) return null;

        try {
            const notifications = [];
            for (const propId of addedIds) {
                const propSnap = await db.collection("properties").doc(propId).get();
                if (propSnap.exists()) {
                    const prop = propSnap.data();
                    const agentId = prop.agentId;
                    
                    if (agentId && agentId !== context.params.userId) { // Don't notify if agent favorites their own property
                        const agentSnap = await db.collection("users").doc(agentId).get();
                        const agentData = agentSnap.data();
                        
                        if (agentData && agentData.fcmTokens && agentData.fcmTokens.length > 0) {
                            notifications.push(admin.messaging().sendMulticast({
                                notification: {
                                    title: "❤️ ¡Propiedad Guardada!",
                                    body: `A alguien le interesó tu propiedad y la guardó: ${prop.title}`,
                                },
                                data: {
                                    propertyId: propId,
                                    type: "property_favorited"
                                },
                                tokens: agentData.fcmTokens
                            }));
                        }
                    }
                }
            }
            await Promise.all(notifications);
            return null;
        } catch (error) {
            console.error("Error in notifyPropertyFavorited:", error);
            return null;
        }
    });
