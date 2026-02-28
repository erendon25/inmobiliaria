import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, writeBatch, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';
import { Upload, MapPin, DollarSign, Home, Maximize, Loader2, Plus, X, Lock, User, FileText, Trash2, Calendar, Phone, Clock, Camera, Mail, Facebook, Youtube, RotateCw, Lightbulb, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import MapPicker from '../components/MapPicker';
import PropertyFormFields from '../components/PropertyFormFields';
import ContractTemplates from '../components/ContractTemplates';
import GenerateContractModal from '../components/GenerateContractModal';
import logo from '../assets/logo.png';
import { fetchSunatExchangeRate } from '../lib/exchangeRate';
import { PERU_LOCATIONS } from '../data/locations';

const AgentDashboard = () => {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState('properties'); // properties, inquiries, profile, tips, templates

    // Contract State
    const [visitToContract, setVisitToContract] = useState(null);

    // Activation State
    const [activationCode, setActivationCode] = useState('');
    const [activating, setActivating] = useState(false);

    // Profile State
    const [profileData, setProfileData] = useState({
        displayName: '',
        email: '',
        phoneNumber: '',
        currentPassword: '',
        newPassword: ''
    });
    const [updatingProfile, setUpdatingProfile] = useState(false);

    // Tips State
    const [tips, setTips] = useState([]);
    const [tipForm, setTipForm] = useState({ title: '', content: '' });
    const [tipImage, setTipImage] = useState(null);
    const [editingTipId, setEditingTipId] = useState(null);
    const [loadingTips, setLoadingTips] = useState(false);

    // Property Form State
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

    // Crop Image states
    const [cropImage, setCropImage] = useState(null); // The image object being cropped { file: File, index: number, newFileIndex: number }
    const [cropImageUrl, setCropImageUrl] = useState(null); // URL to display
    const [crop, setCrop] = useState({ unit: '%', width: 80, aspect: 16 / 9 });
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    // Property List State
    const [myProperties, setMyProperties] = useState([]);
    const [visits, setVisits] = useState([]); // Replaces inquiries
    const [loadingProps, setLoadingProps] = useState(true);
    const [profileImage, setProfileImage] = useState(null);

    // Visit Slot Management
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [slotPropertyId, setSlotPropertyId] = useState(null);
    const [slotPropertyTitle, setSlotPropertyTitle] = useState('');
    const [currentSlots, setCurrentSlots] = useState([]);
    const [newSlotDate, setNewSlotDate] = useState('');
    const [newSlotTime, setNewSlotTime] = useState('');

    // Location Suggestions State
    const [filteredLocations, setFilteredLocations] = useState([]);
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

    // Fetch my properties function
    const fetchMyProperties = async () => {
        if (!user) return;
        setLoadingProps(true);
        try {
            const q = query(collection(db, "properties"), where("agentId", "==", user.uid));
            const snap = await getDocs(q);
            const props = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            props.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setMyProperties(props);
        } catch (error) {
            console.error("Error fetching properties:", error);
        } finally {
            setLoadingProps(false);
        }
    };

    // Fetch my tips function
    const fetchMyTips = async () => {
        if (!user) return;
        setLoadingTips(true);
        try {
            const q = query(collection(db, "tips"), where("agentId", "==", user.uid));
            const snap = await getDocs(q);
            const tipsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            tipsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setTips(tipsData);
        } catch (error) {
            console.error("Error fetching tips:", error);
            toast.error("Error al cargar mis tips.");
        } finally {
            setLoadingTips(false);
        }
    };

    // Load data on mount/tab change if user is activated
    useEffect(() => {
        if (userData?.isActivated) {
            fetchMyProperties();

            // Also fetch visits
            const fetchVisits = async () => {
                try {
                    const q = query(collection(db, "visits"), where("agentId", "==", user.uid));
                    const snap = await getDocs(q);
                    setVisits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } catch (error) {
                    console.error("Error fetching visits:", error);
                }
            };
            fetchVisits();

            // Fetch tips if active tab or first load
            fetchMyTips();

            // Fetch Exchange Rate to pre-fill form
            fetchSunatExchangeRate().then(rate => {
                if (rate) {
                    setFormData(prev => ({ ...prev, exchangeRate: rate }));
                }
            });
        }

        // Initialize profile form with current user data
        setProfileData({
            displayName: userData?.displayName || user?.displayName || '',
            email: user?.email || userData?.email || '',
            phoneNumber: userData?.phoneNumber || '',
            currentPassword: '',
            newPassword: '',
            photoURL: userData?.photoURL || user?.photoURL || ''
        });
    }, [user, userData]);

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar esta propiedad?")) return;
        // Optimistic: remove immediately from UI
        const backup = myProperties;
        setMyProperties(prev => prev.filter(p => p.id !== id));
        toast.success("Propiedad eliminada correctamente.");
        try {
            await deleteDoc(doc(db, "properties", id));
        } catch (error) {
            // Revert on error
            setMyProperties(backup);
            console.error("Error deleting property:", error);
            toast.error("Error al eliminar la propiedad.");
        }
    };

    const handleUploadDraft = async (visit, file) => {
        if (!file) return;

        const toastId = toast.loading(`Subiendo borrador "${file.name}"...`);
        try {
            const storageRef = ref(storage, `contracts/${user.uid}/${visit.id}_${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const visitRef = doc(db, "visits", visit.id);
            await updateDoc(visitRef, {
                contractDraftUrl: downloadURL,
                contractDraftName: file.name
            });

            setVisits(prev => prev.map(v => v.id === visit.id ? { ...v, contractDraftUrl: downloadURL, contractDraftName: file.name } : v));
            toast.success("Borrador subido exitosamente.", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Error al subir el borrador.", { id: toastId });
        }
    };

    const handleActivation = async (e) => {
        e.preventDefault();
        setActivating(true);

        try {
            // Find code
            const q = query(collection(db, "activation_codes"), where("code", "==", activationCode), where("used", "==", false));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast.error("Código inválido o ya usado.");
                setActivating(false);
                return;
            }

            const codeDoc = querySnapshot.docs[0];

            // Mark code as used
            await updateDoc(doc(db, "activation_codes", codeDoc.id), {
                used: true,
                usedBy: user.uid,
                usedAt: new Date()
            });

            // Activate User and link code
            await updateDoc(doc(db, "users", user.uid), {
                isActivated: true,
                activationCode: activationCode
            });

            toast.success("¡Cuenta activada con éxito! Recargando...");
            setTimeout(() => window.location.reload(), 1500);

        } catch (error) {
            console.error("Error activating account:", error);
            toast.error("Error al activar la cuenta.");
        } finally {
            setActivating(false);
        }
    };

    // Profile Update Handler
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setUpdatingProfile(true);
        try {
            // Determine if sensitive operations are needed
            const isChangingEmail = profileData.email !== user.email;
            const isChangingPassword = profileData.newPassword && profileData.newPassword.length > 0;

            // Re-authenticate FIRST if any sensitive operation is needed
            if (isChangingEmail || isChangingPassword) {
                if (!profileData.currentPassword) {
                    throw new Error("Debes ingresar tu contraseña actual para cambiar el email o la contraseña.");
                }
                if (isChangingPassword && profileData.newPassword.length < 6) {
                    throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
                }
                const credential = EmailAuthProvider.credential(user.email, profileData.currentPassword);
                await reauthenticateWithCredential(user, credential);
            }

            // 1. Update Auth Profile (Name)
            if (profileData.displayName !== user.displayName) {
                await updateProfile(user, { displayName: profileData.displayName });
            }
            // 2. Update Auth Email (if changed - now safe because we re-authenticated above)
            if (isChangingEmail) {
                try {
                    await verifyBeforeUpdateEmail(user, profileData.email);
                    toast.success("IMPORTANTE: Se ha enviado un correo de verificación a tu nuevo email. Tu correo anterior no cambiará hasta que hagas clic en el enlace de confirmación.");
                } catch (emailError) {
                    console.error('Email update error:', emailError);
                    throw new Error("Error al intentar cambiar el correo. Por favor, intenta de nuevo más tarde.");
                }
            }

            let photoURL = user.photoURL;

            // 0. Update Profile Photo if selected
            if (profileImage) {
                const storageRef = ref(storage, `profile_photos/${user.uid}/${Date.now()}_${profileImage.name}`);
                const snapshot = await uploadBytes(storageRef, profileImage);
                photoURL = await getDownloadURL(snapshot.ref);
                await updateProfile(user, { photoURL });
            }

            // 3. Update Firestore User Doc
            await updateDoc(doc(db, "users", user.uid), {
                displayName: profileData.displayName,
                email: profileData.email,
                phoneNumber: profileData.phoneNumber,
                photoURL: photoURL || ""
            });

            // 3.5 Update Password (now safe because we re-authenticated above)
            if (isChangingPassword) {
                await updatePassword(user, profileData.newPassword);
                setProfileData(prev => ({ ...prev, newPassword: '', currentPassword: '' }));
                toast.success("Contraseña actualizada.");
            }

            // 4. Batch Update all properties with new Agent Name
            const batch = writeBatch(db);
            const propsQuery = query(collection(db, "properties"), where("agentId", "==", user.uid));
            const propsSnap = await getDocs(propsQuery);
            propsSnap.forEach(doc => {
                batch.update(doc.ref, {
                    agentName: profileData.displayName,
                    agentPhone: profileData.phoneNumber || '',
                    agentPhotoURL: photoURL || ""
                });
            });

            // 5. Batch Update all tips with new Agent Info
            const tipsQuery = query(collection(db, "tips"), where("agentId", "==", user.uid));
            const tipsSnap = await getDocs(tipsQuery);
            tipsSnap.forEach(doc => {
                batch.update(doc.ref, {
                    agentName: profileData.displayName,
                    agentPhotoURL: photoURL || ""
                });
            });

            await batch.commit();

            toast.success("Perfil actualizado correctamente.");
            // Refresh properties to see new name if needed locally
            fetchMyProperties();
        } catch (error) {
            console.error("Error updating profile:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast.error("La contraseña actual es incorrecta.");
            } else if (error.code === 'auth/requires-recent-login') {
                toast.error("Tu sesión ha expirado. Por favor, cierra sesión e inicia de nuevo.");
            } else {
                toast.error(error.message || "Error al actualizar perfil.");
            }
        } finally {
            setUpdatingProfile(false);
        }
    };

    // Tips Handlers
    // Tips Handlers
    const handleTipSubmit = async (e) => {
        e.preventDefault();
        setLoadingTips(true);
        try {
            let imageUrl = '';

            // Upload Image if exists
            if (tipImage) {
                const storageRef = ref(storage, `tip_images/${user.uid}/${Date.now()}_${tipImage.name}`);
                const snapshot = await uploadBytes(storageRef, tipImage);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            if (editingTipId) {
                const updateData = {
                    ...tipForm,
                    updatedAt: new Date()
                };
                if (imageUrl) {
                    updateData.imageUrl = imageUrl;
                }
                await updateDoc(doc(db, "tips", editingTipId), updateData);
                toast.success("Tip actualizado.");
                await addDoc(collection(db, "tips"), {
                    ...tipForm,
                    agentId: user.uid,
                    agentName: userData?.displayName || user?.displayName || 'Agente',
                    agentPhotoURL: userData?.photoURL || "",
                    createdAt: new Date(),
                    likes: 0,
                    imageUrl: imageUrl || null
                });
                toast.success("Tip publicado.");
            }

            setTipForm({ title: '', content: '' });
            setTipImage(null);
            setEditingTipId(null);

            // Refresh Tips using helper function
            if (typeof fetchMyTips === 'function') {
                fetchMyTips();
            } else {
                // Fallback if fetchMyTips is not defined in scope (though it should be)
                // This prevents crashes if the function name changed.
                // Assuming logic to refresh tips is handled elsewhere or by a listener? 
                // Actually fetchMyTips is likely defined below or I missed it. I'll assume it exists as per previous code.
            }
        } catch (error) {
            console.error("Error saving tip:", error);
            if (error.code === 'failed-precondition') {
                toast.error("El índice de base de datos se está creando. Intenta de nuevo en unos minutos.");
            } else {
                toast.error("Error al guardar el tip.");
            }
        } finally {
            setLoadingTips(false);
        }
    };

    const handleDeleteTip = async (id) => {
        if (!window.confirm("¿Seguro que quieres eliminar este tip?")) return;
        const backup = tips;
        setTips(prev => prev.filter(t => t.id !== id));
        toast.success("Tip eliminado.");
        try {
            await deleteDoc(doc(db, "tips", id));
        } catch (error) {
            setTips(backup);
            console.error("Error deleting tip:", error);
            toast.error("Error al eliminar el tip.");
        }
    };

    const handleEditTip = (tip) => {
        setTipForm({
            title: tip.title || '',
            content: tip.content || ''
        });
        setEditingTipId(tip.id);
        setActiveTab('tips'); // Ensure tab is active
    };

    const handleStatusToggle = async (propertyId, currentStatus) => {
        const newStatus = currentStatus === 'disponible' ? 'tomada' : 'disponible';
        // Optimistic update: update local state immediately
        setMyProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: newStatus } : p));
        toast.success(`Estado actualizado a: ${newStatus === 'disponible' ? 'Disponible' : 'No Disponible'}`);
        try {
            await updateDoc(doc(db, "properties", propertyId), {
                status: newStatus
            });
        } catch (error) {
            // Revert on error
            setMyProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: currentStatus } : p));
            console.error("Error updating status:", error);
            toast.error("No se pudo actualizar el estado.");
        }
    };

    const handlePublish = async (propertyId) => {
        setMyProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'disponible' } : p));
        toast.success('¡Propiedad publicada con éxito!');
        try {
            await updateDoc(doc(db, "properties", propertyId), {
                status: 'disponible',
                publishedAt: new Date()
            });
        } catch (error) {
            setMyProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'borrador' } : p));
            console.error("Error publishing property:", error);
            toast.error("No se pudo publicar la propiedad.");
        }
    };

    // Visit Slot Management
    const openSlotManager = (property) => {
        setSlotPropertyId(property.id);
        setSlotPropertyTitle(property.title);
        setCurrentSlots(property.availableVisitSlots || []);
        setNewSlotDate('');
        setNewSlotTime('');
        setShowSlotModal(true);
    };

    const addSlot = () => {
        if (!newSlotDate || !newSlotTime) {
            toast.error('Selecciona fecha y hora.');
            return;
        }
        const newSlot = { date: newSlotDate, time: newSlotTime, id: Date.now().toString() };
        setCurrentSlots(prev => [...prev, newSlot]);
        setNewSlotDate('');
        setNewSlotTime('');
    };

    const removeSlot = (slotId) => {
        setCurrentSlots(prev => prev.filter(s => s.id !== slotId));
    };

    const saveSlots = async () => {
        try {
            await updateDoc(doc(db, "properties", slotPropertyId), {
                availableVisitSlots: currentSlots
            });
            // Optimistic: update local
            setMyProperties(prev => prev.map(p => p.id === slotPropertyId ? { ...p, availableVisitSlots: currentSlots } : p));
            toast.success('Horarios de visita guardados.');
            setShowSlotModal(false);
        } catch (error) {
            console.error('Error saving slots:', error);
            toast.error('Error al guardar horarios.');
        }
    };

    const handleVisitAction = async (visitId, action) => {
        try {
            if (action === 'delete') {
                const proceed = window.confirm("¿Seguro que deseas eliminar el registro de esta visita agendada?");
                if (!proceed) return;
                await deleteDoc(doc(db, "inquiries", visitId));
                setVisits(visits.filter(v => v.id !== visitId));
                toast.success('Visita agendada eliminada');
                return;
            }

            await updateDoc(doc(db, "inquiries", visitId), {
                status: action
            });
            setVisits(visits.map(v => v.id === visitId ? { ...v, status: action } : v));
            toast.success(`Visita ${action === 'accepted' ? 'confirmada' : 'denegada'} exitosamente`);
        } catch (error) {
            console.error("Error updating visit status:", error);
            toast.error("Error al actualizar la visita");
        }
    };

    const handlePromoteToggle = async (propertyId, currentPromoted) => {
        try {
            await updateDoc(doc(db, "properties", propertyId), {
                isPromoted: !currentPromoted
            });
            toast.success(!currentPromoted ? "¡Propiedad destacada!" : "Propiedad ya no está destacada");
            // Listener handles update
        } catch (error) {
            console.error("Error updating promotion:", error);
            toast.error("Error al destacar propiedad");
        }
    };

    const handleImageChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setImages([...images, ...selectedFiles]);

        const previewUrls = selectedFiles.map(file => URL.createObjectURL(file));
        setImagePreviews([...imagePreviews, ...previewUrls]);
    };

    const removeImage = (index) => {
        const newImages = [...images];
        // Calculate the index in the `images` array for new files (blob URLs)
        // Existing images (http URLs) are not in the `images` state, only in `imagePreviews`
        const newFileIndex = imagePreviews.slice(0, index).filter(url => url.startsWith('blob:')).length;

        if (imagePreviews[index].startsWith('blob:')) {
            // If it's a new file, remove it from the `images` state
            newImages.splice(newFileIndex, 1);
            setImages(newImages);
        } else {
            // If it's an existing image, we need to handle its deletion from storage later
            // For now, just remove from preview
            // If we want to delete from storage immediately, we'd need the image URL and deleteObject
            // For this implementation, we'll assume deletion from storage happens on property update if not present in new imagePreviews
        }

        const newPreviews = [...imagePreviews];
        newPreviews.splice(index, 1);
        setImagePreviews(newPreviews);
    };

    const openCropModal = (index) => {
        const urlToCrop = imagePreviews[index];
        // Only allow cropping new local images (blob:http...) for simplicity in this iteration
        if (urlToCrop.startsWith('http') && !urlToCrop.startsWith('blob:')) {
            toast.error("Solo puedes recortar imágenes nuevas antes de subirlas");
            return;
        }

        const newFileIndex = imagePreviews.slice(0, index).filter(u => u.startsWith('blob:')).length;
        if (newFileIndex >= 0 && images[newFileIndex]) {
            setCropImage({
                file: images[newFileIndex],
                index: index, // Index in imagePreviews
                newFileIndex: newFileIndex // Index in images (for new files)
            });
            setCropImageUrl(urlToCrop);
            setCrop({ unit: '%', width: 80, aspect: 16 / 9 }); // Default aspect ratio
        }
    };

    const handleSaveCrop = async () => {
        if (!completedCrop || !imgRef.current || !cropImage) return;

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        const ctx = canvas.getContext('2d');

        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width,
            completedCrop.height
        );

        canvas.toBlob((blob) => {
            if (!blob) {
                toast.error("Error al recortar la imagen.");
                return;
            }
            const newFile = new File([blob], cropImage.file.name, { type: cropImage.file.type });
            const newUrl = URL.createObjectURL(newFile);

            // Update state with cropped file
            const newImagesList = [...images];
            newImagesList[cropImage.newFileIndex] = newFile;
            setImages(newImagesList);

            const newPreviewsList = [...imagePreviews];
            newPreviewsList[cropImage.index] = newUrl;
            setImagePreviews(newPreviewsList);

            setCropImage(null);
            setCropImageUrl(null);
            setCompletedCrop(null);
            toast.success("Imagen recortada y actualizada.");
        }, cropImage.file.type);
    };

    const handleRotateImage = (index) => {
        const urlToRotate = imagePreviews[index];
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Support CORS for Firebase storage images

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.height;
            canvas.height = img.width;
            const ctx = canvas.getContext('2d');

            // Rotate 90 degrees clockwise
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);

            canvas.toBlob((blob) => {
                if (!blob) {
                    toast.error("Error al rotar la imagen.");
                    return;
                }
                const newFile = new File([blob], `rotated_${Date.now()}.jpg`, { type: 'image/jpeg' });
                const newUrl = URL.createObjectURL(newFile);

                if (urlToRotate.startsWith('blob:')) {
                    const newFileIndex = imagePreviews.slice(0, index).filter(u => u.startsWith('blob:')).length;
                    if (newFileIndex >= 0 && newFileIndex < images.length) {
                        const newImagesList = [...images];
                        newImagesList[newFileIndex] = newFile;
                        setImages(newImagesList);
                    }
                } else {
                    const newFileIndex = imagePreviews.slice(0, index).filter(u => u.startsWith('blob:')).length;
                    const newImagesList = [...images];
                    newImagesList.splice(newFileIndex, 0, newFile);
                    setImages(newImagesList);
                }

                const newPreviewsList = [...imagePreviews];
                newPreviewsList[index] = newUrl;
                setImagePreviews(newPreviewsList);

            }, 'image/jpeg', 0.9);
        };
        img.onerror = () => {
            toast.error("Para rotar imágenes antiguas necesitas habilitar CORS en tu Firebase Storage desde Google Cloud.");
        };

        // Evitamos que el navegador use la versión bloqueada por caché añadiendo un parámetro temporal
        if (urlToRotate.startsWith('http')) {
            img.src = urlToRotate + (urlToRotate.includes('?') ? '&' : '?') + 'cb=' + new Date().getTime();
        } else {
            img.src = urlToRotate;
        }
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'venta',
        currency: 'USD',
        price: '',
        category: 'Casa',
        location: '',
        youtubeVideoUrl: '',

        ownerName: '',
        ownerDni: '',
        ownerCivilStatus: 'Soltero(a)',
        ownerSpouseName: '',
        ownerSpouseDni: '',

        footage: '', // Kept for retrocompatibility
        areaTerreno: '',
        areaConstruida: '',
        areaLibre: '',
        areaFrente: '',
        areaFondo: '',
        floors: '',
        buildableFloors: '',
        floorLevel: '',
        garageCapacity: '',
        environments: '',
        bedrooms: '',
        bathrooms: '',

        isDuplex: 'no',
        alcabala: false,
        patio: false,
        solarHeater: false,
        gasHeater: false,
        independentWater: false,
        independentLight: false,
        petsAllowed: false,
        commercialUse: false,
        wheelchairElevator: false,
        commonAreas: false,
        inPrivateResidential: 'no',
        fenced: false,
        warehouseUse: false,
        changeOfUse: 'no',
        condominium: false,
        seaView: 'interior',
        terrace: false,
        mainAvenue: false,
        threePhaseLight: false,
        potableWater: false,
        streetDoor: false,
        mall: false,

        antiquity: 'estreno',
        isExclusive: false,
        isInBuilding: false,
        parking: false,
        elevator: false,
        furnished: false,
        pool: false,
        gym: false,
        security: false,
        disabilityAccess: false,
        ramp: false,
        mortgageEligible: false,
        drainage: false,
        status: 'draft',
        exchangeRate: 3.80
    });

    const handleEdit = (property) => {
        setEditingId(property.id);
        const p = property; // short ref
        setFormData({
            title: p.title || '',
            description: p.description || '',
            type: p.type || 'venta',
            currency: p.currency || 'USD',
            price: p.price || '',
            category: p.category || 'Casa',
            location: p.location || '',
            youtubeVideoUrl: p.youtubeVideoUrl || '',

            ownerName: p.ownerName || '',
            ownerDni: p.ownerDni || '',
            ownerCivilStatus: p.ownerCivilStatus || 'Soltero(a)',
            ownerSpouseName: p.ownerSpouseName || '',
            ownerSpouseDni: p.ownerSpouseDni || '',

            footage: p.footage || '',
            areaTerreno: p.areaTerreno || '',
            areaConstruida: p.areaConstruida || '',
            areaLibre: p.areaLibre || '',
            areaFrente: p.areaFrente || '',
            areaFondo: p.areaFondo || '',
            floors: p.floors || '',
            buildableFloors: p.buildableFloors || '',
            floorLevel: p.floorLevel || '',
            garageCapacity: p.garageCapacity || '',
            environments: p.environments || '',
            bedrooms: p.bedrooms || '',
            bathrooms: p.bathrooms || '',

            isDuplex: p.isDuplex || 'no',
            alcabala: p.alcabala || false,
            patio: p.patio || false,
            solarHeater: p.solarHeater || false,
            gasHeater: p.gasHeater || false,
            independentWater: p.independentWater || false,
            independentLight: p.independentLight || false,
            petsAllowed: p.petsAllowed || false,
            commercialUse: p.commercialUse || false,
            wheelchairElevator: p.wheelchairElevator || false,
            commonAreas: p.commonAreas || false,
            inPrivateResidential: p.inPrivateResidential || 'no',
            fenced: p.fenced || false,
            warehouseUse: p.warehouseUse || false,
            changeOfUse: p.changeOfUse || 'no',
            condominium: p.condominium || false,
            seaView: p.seaView || 'interior',
            terrace: p.terrace || false,
            mainAvenue: p.mainAvenue || false,
            threePhaseLight: p.threePhaseLight || false,
            potableWater: p.potableWater || false,
            streetDoor: p.streetDoor || false,
            mall: p.mall || false,

            antiquity: p.antiquity || 'estreno',
            isExclusive: p.isExclusive || false,
            isInBuilding: p.isInBuilding || false,
            parking: p.parking || false,
            elevator: p.elevator || false,
            furnished: p.furnished || false,
            pool: p.pool || false,
            gym: p.gym || false,
            security: p.security || false,
            disabilityAccess: p.disabilityAccess || false,
            ramp: p.ramp || false,
            mortgageEligible: p.mortgageEligible || false,
            drainage: p.drainage || false,
            status: p.status || 'draft',
            exchangeRate: p.exchangeRate || 3.80,

            lat: p.lat || '',
            lng: p.lng || '',
        });
        setImagePreviews(property.images || []);
        setImages([]); // Clear new files queue
        setActiveTab('properties'); // Ensure properties tab is active

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({
            title: '',
            description: '',
            type: 'venta',
            currency: 'USD',
            price: '',
            category: 'Casa',
            location: '',
            youtubeVideoUrl: '',

            ownerName: '',
            ownerDni: '',
            ownerCivilStatus: 'Soltero(a)',
            ownerSpouseName: '',
            ownerSpouseDni: '',
            footage: '',
            areaTerreno: '',
            areaConstruida: '',
            areaLibre: '',
            areaFrente: '',
            areaFondo: '',
            floors: '',
            buildableFloors: '',
            floorLevel: '',
            garageCapacity: '',
            environments: '',
            bedrooms: '',
            bathrooms: '',
            isDuplex: 'no',
            alcabala: false,
            patio: false,
            solarHeater: false,
            gasHeater: false,
            independentWater: false,
            independentLight: false,
            petsAllowed: false,
            commercialUse: false,
            wheelchairElevator: false,
            commonAreas: false,
            inPrivateResidential: 'no',
            fenced: false,
            warehouseUse: false,
            changeOfUse: 'no',
            condominium: false,
            seaView: 'interior',
            terrace: false,
            mainAvenue: false,
            threePhaseLight: false,
            potableWater: false,
            streetDoor: false,
            mall: false,
            antiquity: 'estreno',
            isExclusive: false,
            isInBuilding: false,
            parking: false,
            elevator: false,
            furnished: false,
            pool: false,
            gym: false,
            security: false,
            disabilityAccess: false,
            ramp: false,
            mortgageEligible: false,
            status: 'draft',
            exchangeRate: 3.80
        });
        setImagePreviews([]);
        setImages([]);
    };

    const saveProperty = async (statusOverride = null) => {
        const statusToUse = statusOverride || formData.status || 'draft';

        // Validation for required fields if publishing
        if (statusToUse !== 'draft') {
            const missingFields = [];
            if (!formData.title?.trim()) missingFields.push('Título');
            if (!formData.price || parseFloat(formData.price) <= 0) missingFields.push('Precio');
            if (!formData.location?.trim()) missingFields.push('Ubicación en el mapa');
            // Allow areaTerreno or areaConstruida as a proxy for 'footage'
            if (!formData.areaTerreno && !formData.areaConstruida && !formData.footage) missingFields.push('Área de terreno o construida');

            if (missingFields.length > 0) {
                toast.error(`Para publicar necesitas completar: ${missingFields.join(', ')}`);
                return;
            }

            if (images.length === 0 && imagePreviews.length === 0) {
                const proceed = window.confirm("No has subido ninguna imagen. ¿Deseas publicar la propiedad de todas formas sin fotos?");
                if (!proceed) return;
            }
        }

        setLoading(true);

        try {
            // Parallel Uploads
            const uploadPromises = images.map(async (image) => {
                const storageRef = ref(storage, `properties/${user.uid}/${Date.now()}_${image.name}`);
                const snapshot = await uploadBytes(storageRef, image);
                return await getDownloadURL(snapshot.ref);
            });

            const newImageUrls = await Promise.all(uploadPromises);
            // Removed redundant declaration of statusToUse here

            if (editingId) {
                // Update existing property
                const updateData = {
                    ...formData,
                    status: statusToUse,
                    price: parseFloat(formData.price),
                    footage: parseFloat(formData.footage),
                    bedrooms: formData.category === 'construido' ? parseInt(formData.bedrooms) : 0,
                    bathrooms: formData.category === 'construido' ? parseInt(formData.bathrooms) : 0,
                    agentPhone: userData.phoneNumber || '',
                    agentPhotoURL: userData.photoURL || ''
                };

                // Filter out old image URLs that are no longer in imagePreviews
                const existingImageUrls = imagePreviews.filter(url => !url.startsWith('blob:'));
                updateData.images = [...existingImageUrls, ...newImageUrls];

                await updateDoc(doc(db, "properties", editingId), updateData);
                toast.success(statusToUse === 'draft' ? "Borrador guardado" : "¡Propiedad actualizada!");
            } else {
                // Create new property
                const newPropertyData = {
                    ...formData,
                    status: statusToUse, // Use override or form data
                    agentId: user.uid,
                    agentName: userData.displayName || 'Agente',
                    agentPhone: userData.phoneNumber || '',
                    agentPhotoURL: userData.photoURL || '',
                    images: newImageUrls,
                    createdAt: new Date(),
                    views: 0,
                    isPromoted: false,
                    price: parseFloat(formData.price),
                    footage: parseFloat(formData.footage),
                    bedrooms: formData.category === 'construido' ? parseInt(formData.bedrooms) : 0,
                    bathrooms: formData.category === 'construido' ? parseInt(formData.bathrooms) : 0,
                };

                await addDoc(collection(db, "properties"), newPropertyData);
                toast.success(statusToUse === 'draft' ? "Borrador guardado" : "¡Propiedad publicada!");

                // Reset form
                handleCancelEdit();
                fetchMyProperties();
            }
        } catch (error) {
            console.error("Error adding property: ", error);
            toast.error("Hubo un error al guardar.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveProperty();
    };

    const handleShareToMarketplace = () => {
        const textArea = formData.areaTerreno || formData.areaConstruida || formData.footage || '';
        const text = `🏡 *${formData.title || 'Propiedad'}*\n` +
            `💰 Precio: ${formData.currency === 'USD' ? '$' : 'S/.'} ${formData.price}\n\n` +
            `📍 Ubicación: ${formData.location}\n` +
            (textArea ? `📏 Área: ${textArea} m²\n\n` : '\n') +
            `📝 Descripción:\n${formData.description}\n\n` +
            `Contactar con: ${userData?.phoneNumber || 'Nosotros (Inmuévete)'}`;

        navigator.clipboard.writeText(text).then(() => {
            toast.success("¡Información copiada! Pega el texto en Marketplace.", { duration: 5000 });
            window.open('https://www.facebook.com/marketplace/create/item', '_blank');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            toast.error("Error al copiar texto. Por favor copia manualmente.");
        });
    };


    // Dev Helper - only attempt if user is superadmin to avoid permission errors
    useEffect(() => {
        if (userData?.role !== 'superadmin') return;
        const ensureCode = async () => {
            try {
                const q = query(collection(db, "activation_codes"), where("code", "==", "AGENT2024"));
                const snapshot = await getDocs(q);
                if (snapshot.empty) {
                    await addDoc(collection(db, "activation_codes"), {
                        code: "AGENT2024",
                        used: false,
                        createdAt: new Date(),
                        type: 'standard'
                    });
                }
            } catch (error) {
                // Silently ignore - only superadmins can create codes
                console.debug("Skipping code creation (not authorized)");
            }
        };
        ensureCode();
    }, [userData]);

    const isActivated = userData?.isActivated;

    return (
        <div className="min-h-screen bg-gray-50 pt-28 pb-12 px-6">
            <div className="container mx-auto max-w-6xl">
                {/* Header & Tabs */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-[Montserrat] text-gray-800 mb-6">Panel de Agente</h1>
                    <div className="flex flex-wrap gap-4 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('properties')}
                            className={`pb-4 px-2 flex items-center gap-2 font-bold text-lg transition-colors border-b-4 ${activeTab === 'properties' ? 'border-[#fc7f51] text-[#fc7f51]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            <Home className="w-5 h-5" /> Propiedades
                        </button>
                        <button
                            onClick={() => setActiveTab('inquiries')}
                            className={`pb-4 px-2 font-bold text-lg flex items-center gap-2 transition-colors border-b-4 ${activeTab === 'inquiries' ? 'border-[#fc7f51] text-[#fc7f51]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            <Calendar className="w-5 h-5" /> Visitas
                            {visits.filter(v => v.status === 'pending').length > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{visits.filter(v => v.status === 'pending').length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`pb-4 px-2 font-bold text-lg flex items-center gap-2 transition-colors border-b-4 ${activeTab === 'templates' ? 'border-[#fc7f51] text-[#fc7f51]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            <FileText className="w-5 h-5" /> Plantillas de Contrato
                        </button>
                        <button
                            onClick={() => setActiveTab('tips')}
                            className={`pb-4 px-2 font-bold text-lg flex items-center gap-2 transition-colors border-b-4 ${activeTab === 'tips' ? 'border-[#fc7f51] text-[#fc7f51]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            <Lightbulb className="w-5 h-5" /> Tips
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`pb-4 px-2 font-bold text-lg flex items-center gap-2 transition-colors border-b-4 ${activeTab === 'profile' ? 'border-[#fc7f51] text-[#fc7f51]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            <User className="w-5 h-5" /> Mi Perfil
                        </button>
                    </div>
                </div>

                {!isActivated ? (
                    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                            <Lock className="w-8 h-8 text-[#fc7f51]" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Cuenta Inactiva</h3>
                        <p className="text-gray-500 mb-6 text-sm">
                            Ingresa tu código de activación para acceder al panel.
                        </p>
                        <form onSubmit={handleActivation} className="w-full space-y-4">
                            <input
                                type="text"
                                value={activationCode}
                                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition text-center font-mono text-lg tracking-widest uppercase"
                                placeholder="CÓDIGO"
                                required
                            />
                            <button
                                type="submit"
                                disabled={activating}
                                className="w-full bg-[#fc7f51] text-white py-3 rounded-lg font-bold hover:bg-[#e56b3e] transition disabled:opacity-70"
                            >
                                {activating ? "Verificando..." : "Activar Cuenta"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {/* PROPERTIES TAB */}
                        {activeTab === 'properties' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Form */}
                                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 h-fit">
                                    <div className="bg-[#16151a] p-6 text-white">
                                        <h2 className="text-xl font-bold">{editingId ? "Editar Propiedad" : "Nueva Propiedad"}</h2>
                                    </div>
                                    <form onSubmit={(e) => handleSubmit(e)} className="p-8 space-y-6">
                                        {/* Basic Info */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                                            <input required type="text" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none uppercase" placeholder="Ej: Departamento en Miraflores" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value.toUpperCase() })} />
                                        </div>

                                        {/* Global Details: Price, Type, Category */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Precio</label>
                                                <div className="flex">
                                                    <select className="w-24 px-2 py-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm font-bold" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                                                        <option value="USD">USD</option>
                                                        <option value="PEN">PEN</option>
                                                    </select>
                                                    <input required type="number" className="w-full px-4 py-3 rounded-r-lg border border-gray-200 focus:border-[#fc7f51] outline-none" placeholder="0.00" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Operación</label>
                                                <select
                                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                                    value={formData.type}
                                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                    disabled={formData.category === 'Terreno de playa'}
                                                >
                                                    <option value="venta">Venta</option>
                                                    {formData.category !== 'Terreno de playa' && <option value="alquiler">Alquiler</option>}
                                                    {formData.category !== 'Terreno de playa' && <option value="anticresis">Anticresis</option>}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                                                <select
                                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white font-bold text-[#fc7f51]"
                                                    value={formData.category}
                                                    onChange={e => {
                                                        const newCategory = e.target.value;
                                                        const newUpdates = { category: newCategory };
                                                        if (newCategory === 'Terreno de playa') {
                                                            newUpdates.type = 'venta';
                                                            newUpdates.antiquity = 'estreno';
                                                        }
                                                        setFormData({ ...formData, ...newUpdates });
                                                    }}
                                                >
                                                    <option value="Casa">Casa</option>
                                                    <option value="Departamento">Departamento</option>
                                                    <option value="Terreno Urbano">Terreno Urbano</option>
                                                    <option value="Terreno Rustico">Terreno Rústico</option>
                                                    <option value="Pre venta">Pre venta</option>
                                                    <option value="Casa de playa">Casa de playa</option>
                                                    <option value="Terreno Comercial">Terreno Comercial</option>
                                                    <option value="Local Comercial">Local Comercial</option>
                                                    <option value="Terreno de playa">Terreno de playa</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Antigüedad</label>
                                                <select
                                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                                    value={formData.antiquity}
                                                    onChange={e => setFormData({ ...formData, antiquity: e.target.value })}
                                                    disabled={formData.category === 'Terreno de playa'}
                                                >
                                                    <option value="estreno">Estreno</option>
                                                    {formData.category !== 'Terreno de playa' && <option value="preventa">Pre-Venta</option>}
                                                    {formData.category !== 'Terreno de playa' && <option value="up_to_5">Hasta 5 años</option>}
                                                    {formData.category !== 'Terreno de playa' && <option value="5_to_10">5 a 10 años</option>}
                                                    {formData.category !== 'Terreno de playa' && <option value="more_than_10">Más de 10 años</option>}
                                                    {formData.category !== 'Terreno de playa' && <option value="more_than_20">Más de 20 años</option>}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 py-2">
                                            <label className="flex items-center cursor-pointer gap-2 w-fit">
                                                <input type="checkbox" className="w-5 h-5 accent-[#fc7f51]" checked={formData.isExclusive} onChange={e => setFormData({ ...formData, isExclusive: e.target.checked })} />
                                                <span className="font-bold text-[#fc7f51]">¿Es Exclusiva?</span>
                                            </label>
                                        </div>

                                        <div className="pt-2 pb-2 border-t border-b border-gray-100">
                                            <PropertyFormFields formData={formData} setFormData={setFormData} />
                                        </div>

                                        {/* Datos del Propietario */}
                                        <div className="pt-4 pb-4 border-b border-gray-100">
                                            <h4 className="text-md font-bold text-gray-800 mb-4">Datos del Propietario (Interno)</h4>
                                            <p className="text-xs text-gray-500 mb-4">Esta información no será pública, se usará únicamente para autocompletar futuros contratos.</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombres del Propietario</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none uppercase"
                                                        placeholder="Ej. Juan Pérez"
                                                        value={formData.ownerName}
                                                        onChange={e => setFormData({ ...formData, ownerName: e.target.value.toUpperCase() })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI del Propietario</label>
                                                    <input
                                                        type="text"
                                                        maxLength="8"
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                                                        placeholder="Ej. 12345678"
                                                        value={formData.ownerDni}
                                                        onChange={e => setFormData({ ...formData, ownerDni: e.target.value })}
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                                                    <select
                                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white font-bold"
                                                        value={formData.ownerCivilStatus}
                                                        onChange={e => setFormData({ ...formData, ownerCivilStatus: e.target.value, ownerSpouseName: '', ownerSpouseDni: '' })}
                                                    >
                                                        <option value="Soltero(a)">Soltero(a)</option>
                                                        <option value="Casado(a)">Casado(a)</option>
                                                        <option value="Divorciado(a)">Divorciado(a)</option>
                                                        <option value="Viudo(a)">Viudo(a)</option>
                                                        <option value="Conviviente">Conviviente</option>
                                                    </select>
                                                </div>

                                                {/* Mostrar campos de Cónyuge si está casado o es conviviente */}
                                                {(formData.ownerCivilStatus === 'Casado(a)' || formData.ownerCivilStatus === 'Conviviente') && (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombres de Cónyuge / Pareja</label>
                                                            <input
                                                                type="text"
                                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none uppercase bg-orange-50/30"
                                                                placeholder="Opcional"
                                                                value={formData.ownerSpouseName}
                                                                onChange={e => setFormData({ ...formData, ownerSpouseName: e.target.value.toUpperCase() })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">DNI de Cónyuge / Pareja</label>
                                                            <input
                                                                type="text"
                                                                maxLength="8"
                                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-orange-50/30"
                                                                placeholder="Opcional"
                                                                value={formData.ownerSpouseDni}
                                                                onChange={e => setFormData({ ...formData, ownerSpouseDni: e.target.value })}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-grow">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        required
                                                        type="text"
                                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition uppercase"
                                                        placeholder="Dirección o Link Maps"
                                                        value={formData.location}
                                                        onFocus={() => formData.location && setShowLocationSuggestions(true)}
                                                        onChange={async (e) => {
                                                            const value = e.target.value;

                                                            // Filter suggestions
                                                            if (value.length > 0) {
                                                                const filtered = PERU_LOCATIONS.filter(loc =>
                                                                    loc.name.toLowerCase().includes(value.toLowerCase()) ||
                                                                    loc.label.toLowerCase().includes(value.toLowerCase())
                                                                ).slice(0, 8);
                                                                setFilteredLocations(filtered);
                                                                setShowLocationSuggestions(true);
                                                            } else {
                                                                setShowLocationSuggestions(false);
                                                            }

                                                            // Check if value is a Google Maps link and try to extract coordinates
                                                            let lat = null, lng = null;

                                                            // Regex for various Google Maps URL formats
                                                            // 1. @lat,lng
                                                            const atMatch = value.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                                                            if (atMatch) {
                                                                lat = parseFloat(atMatch[1]);
                                                                lng = parseFloat(atMatch[2]);
                                                            } else {
                                                                // 2. q=lat,lng or query=lat,lng
                                                                const qMatch = value.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
                                                                if (qMatch) {
                                                                    lat = parseFloat(qMatch[1]);
                                                                    lng = parseFloat(qMatch[2]);
                                                                } else {
                                                                    // 3. /place/lat,lng or just lat,lng in path (less common but possible)
                                                                    // Or simple lat,lng string
                                                                    const simpleMatch = value.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
                                                                    if (simpleMatch) {
                                                                        lat = parseFloat(simpleMatch[1]);
                                                                        lng = parseFloat(simpleMatch[2]);
                                                                    }
                                                                }
                                                            }

                                                            setFormData(prev => ({
                                                                ...prev,
                                                                location: value,
                                                                ...(lat && lng ? { lat, lng } : {})
                                                            }));

                                                            if (lat && lng) {
                                                                try {
                                                                    // Reverse geocode to get clean address
                                                                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                                                                    const data = await response.json();
                                                                    if (data && data.display_name) {
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            location: data.display_name,
                                                                            lat: lat,
                                                                            lng: lng
                                                                        }));
                                                                        toast.success("Dirección detectada automáticamente.");
                                                                        setShowLocationSuggestions(false);
                                                                    } else {
                                                                        toast.success("¡Coordenadas detectadas del enlace!");
                                                                        setShowLocationSuggestions(false);
                                                                    }
                                                                } catch (error) {
                                                                    console.error("Geocoding error:", error);
                                                                    toast.success("¡Coordenadas detectadas del enlace!");
                                                                }
                                                            }
                                                        }}
                                                    />

                                                    {/* Suggestions Dropdown */}
                                                    {showLocationSuggestions && filteredLocations.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-[60] overflow-hidden">
                                                            {filteredLocations.map((loc, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        setFormData(prev => ({ ...prev, location: loc.label }));
                                                                        setShowLocationSuggestions(false);
                                                                    }}
                                                                    className="px-4 py-3 hover:bg-orange-50 cursor-pointer flex items-center gap-2 text-gray-700 text-sm border-b border-gray-50 last:border-0"
                                                                >
                                                                    <MapPin className="w-4 h-4 text-[#fc7f51]" />
                                                                    {loc.label}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMap(true)}
                                                    className="bg-[#262626] text-white px-4 rounded-lg hover:bg-black transition flex items-center justify-center"
                                                    title="Buscar en Mapa"
                                                >
                                                    <MapPin className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Map Modal */}
                                        {showMap && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[600px] flex flex-col overflow-hidden relative">
                                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                        <h3 className="font-bold text-lg text-gray-800">Seleccionar Ubicación</h3>
                                                        <button
                                                            onClick={() => setShowMap(false)}
                                                            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex-grow p-0">
                                                        <MapPicker
                                                            initialLocation={formData.lat && formData.lng ? { lat: formData.lat, lng: formData.lng, address: formData.location } : null}
                                                            initialSearchQuery={formData.location}
                                                            onConfirm={(loc) => {
                                                                setFormData({
                                                                    ...formData,
                                                                    location: loc.address || `${loc.lat}, ${loc.lng}`,
                                                                    lat: loc.lat,
                                                                    lng: loc.lng
                                                                });
                                                                setShowMap(false);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                                            <textarea
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none h-64 resize-y text-sm md:text-base leading-relaxed"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Describe detalladamente la propiedad..."
                                            ></textarea>
                                        </div>

                                        {/* Youtube Video */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                <Youtube className="w-5 h-5 text-red-500" /> URL de Video (YouTube)
                                            </label>
                                            <input
                                                type="url"
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                                                placeholder="Ej: https://www.youtube.com/watch?v=..."
                                                value={formData.youtubeVideoUrl}
                                                onChange={e => setFormData({ ...formData, youtubeVideoUrl: e.target.value })}
                                            />
                                            <p className="text-xs text-gray-400 mt-1">El video aparecerá en el carrusel de imágenes de la propiedad.</p>
                                        </div>

                                        {/* Images */}
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                            <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <Upload className="h-6 w-6 text-[#fc7f51] mx-auto mb-2" />
                                            <p className="text-gray-500 text-sm">Subir fotos</p>
                                        </div>
                                        {imagePreviews.length > 0 && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {imagePreviews.map((url, idx) => (
                                                    <div key={idx} className="aspect-square relative rounded-lg overflow-hidden group">
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage(idx); }}
                                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 z-10"
                                                            title="Eliminar imagen"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col justify-center items-center gap-2">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openCropModal(idx); }}
                                                                    className="bg-white text-gray-800 rounded-full p-1.5 hover:bg-gray-200"
                                                                    title="Recortar imagen"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crop"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></svg>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        try {
                                                                            await handleRotateImage(idx);
                                                                        } catch (error) {
                                                                            toast.error("Error al rotar la imagen. Asegúrate de que tu bucket de Firebase Storage tenga configurado CORS correctamente.");
                                                                        }
                                                                    }}
                                                                    className="bg-white text-gray-800 rounded-full p-1.5 hover:bg-gray-200"
                                                                    title="Rotar 90°"
                                                                >
                                                                    <RotateCw className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex flex-col gap-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => saveProperty('draft')}
                                                    disabled={loading}
                                                    className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-500 font-bold py-3 rounded-xl hover:bg-gray-50 hover:border-gray-400 hover:text-gray-700 transition flex items-center justify-center gap-2"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                    {loading ? 'Guardando...' : 'Guardar Borrador'}
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => saveProperty('disponible')} // For now, direct publish until preview is ready
                                                    className="w-full bg-[#fc7f51] text-white font-bold py-3 rounded-xl hover:bg-[#e56b3e] shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
                                                >
                                                    {loading ? <Loader2 className="animate-spin" /> : 'Publicar Ahora'}
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleShareToMarketplace}
                                                className="w-full bg-[#1877F2] text-white font-bold py-3 rounded-xl hover:bg-[#166FE5] transition flex items-center justify-center gap-2 mt-2"
                                                title="Copia la info y abre Marketplace para publicar"
                                            >
                                                <Facebook className="w-5 h-5" /> Compartir en FB Marketplace
                                            </button>

                                            {editingId && (
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition"
                                                >
                                                    Cancelar Edición
                                                </button>
                                            )}

                                        </div>
                                    </form>
                                </div>
                                {/* Right Column: My Properties List */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-gray-800">Mis Propiedades</h2>
                                        <span className="bg-orange-100 text-[#fc7f51] px-3 py-1 rounded-full text-sm font-bold">
                                            {myProperties.length} Total
                                        </span>
                                    </div>

                                    {loadingProps ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-[#fc7f51]" />
                                        </div>
                                    ) : myProperties.length === 0 ? (
                                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
                                            No has publicado ninguna propiedad aún.
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {myProperties.map(property => (
                                                <div key={property.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                                                    <div className="w-full sm:w-24 h-48 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                                        <img
                                                            src={property.images?.[0] || 'https://placehold.co/150x150/e2e8f0/94a3b8?text=Sin+Img'}
                                                            loading="lazy"
                                                            alt={property.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-grow">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{property.title}</h3>
                                                            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${property.status === 'disponible' ? 'bg-green-100 text-green-700'
                                                                : property.status === 'borrador' ? 'bg-amber-100 text-amber-700'
                                                                    : 'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                {property.status === 'borrador' ? '✏️ Borrador' : property.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-500 text-xs mt-1">{property.location}</p>
                                                        <p className="text-[#fc7f51] font-bold text-sm mt-1">
                                                            {property.currency === 'USD' ? '$' : 'S/.'} {property.price?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                        </p>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {property.status === 'borrador' ? (
                                                                <button
                                                                    onClick={() => handlePublish(property.id)}
                                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none text-center bg-[#fc7f51] text-white hover:bg-[#e56b3e] shadow-sm"
                                                                >
                                                                    🚀 Publicar
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleStatusToggle(property.id, property.status)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none text-center ${property.status === 'disponible'
                                                                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                                        }`}
                                                                >
                                                                    {property.status === 'disponible' ? 'Marcar Vendido/Alquilado' : 'Marcar Disponible'}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleEdit(property)}
                                                                className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition flex-1 sm:flex-none"
                                                            >
                                                                Editar
                                                            </button>
                                                            <button
                                                                onClick={() => openSlotManager(property)}
                                                                className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-100 transition flex-1 sm:flex-none"
                                                                title="Gestionar horarios de visita"
                                                            >
                                                                <Calendar className="w-4 h-4 mx-auto" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(property.id)}
                                                                className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition flex-1 sm:flex-none"
                                                            >
                                                                <Trash2 className="w-4 h-4 mx-auto" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-2xl mx-auto">
                                <div className="bg-[#16151a] p-6 text-white text-center">
                                    <h2 className="text-xl font-bold">Mi Perfil</h2>
                                    <p className="text-gray-400 text-sm mt-1">Administra tu información personal</p>
                                </div>

                                <div className="p-8 space-y-8">
                                    {/* Profile Photo */}
                                    <div className="flex flex-col items-center">
                                        <div className="relative group cursor-pointer">
                                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                                                {profileData.photoURL ? (
                                                    <img src={profileData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <User className="w-12 h-12" />
                                                    </div>
                                                )}
                                            </div>
                                            <label className="absolute bottom-0 right-0 bg-[#fc7f51] text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-[#e56b3e] transition transform hover:scale-105">
                                                <Camera className="w-4 h-4" />
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => setProfileImage(e.target.files[0])} />
                                            </label>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-3">Click en la cámara para cambiar foto</p>
                                    </div>

                                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                                                        value={profileData.displayName || ''}
                                                        onChange={e => setProfileData({ ...profileData, displayName: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="email"
                                                        required
                                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                                                        value={profileData.email || ''}
                                                        onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="tel"
                                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                                                        value={profileData.phoneNumber || ''}
                                                        onChange={e => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                                                        placeholder="+51 999 999 999"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100">
                                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-[#fc7f51]" />
                                                Seguridad (Opcional)
                                            </h3>
                                            <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual <span className="text-gray-400 text-xs font-normal">(Requerido para cambios sensibles)</span></label>
                                                    <input
                                                        type="password"
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white"
                                                        value={profileData.currentPassword || ''}
                                                        onChange={e => setProfileData({ ...profileData, currentPassword: e.target.value })}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                                                    <input
                                                        type="password"
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white"
                                                        value={profileData.newPassword || ''}
                                                        onChange={e => setProfileData({ ...profileData, newPassword: e.target.value })}
                                                        placeholder="Dejar en blanco para no cambiar"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={updatingProfile}
                                            className="w-full bg-[#fc7f51] text-white font-bold py-4 rounded-xl hover:bg-[#e56b3e] shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
                                        >
                                            {updatingProfile ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                        {/* VISITS TAB */}
                        {activeTab === 'inquiries' && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8">
                                <h2 className="text-xl font-bold mb-6">Visitas Agendadas</h2>
                                {visits.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No tienes visitas agendadas aún.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {visits.map(visit => (
                                            <div key={visit.id} className="border border-gray-100 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition gap-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{visit.propertyTitle}</h3>
                                                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                        <User className="w-4 h-4 text-gray-400 font-bold" />
                                                        <span className="font-semibold text-gray-700">{visit.clientName}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex flex-col gap-1 mt-1 ml-5">
                                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {visit.clientEmail}</span>
                                                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {visit.clientPhone}</span>
                                                    </div>
                                                    <p className="text-sm text-[#fc7f51] font-bold mt-2 flex items-center gap-1 bg-orange-50 px-3 py-1 rounded w-fit">
                                                        <Calendar className="w-4 h-4" /> {visit.visitDate} - {visit.visitTime}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-2 items-end">
                                                    <div className="flex gap-2 mb-2">
                                                        {visit.status === 'pending' && (
                                                            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">Pendiente</span>
                                                        )}
                                                        {visit.status === 'confirmed' && (
                                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Aprobada</span>
                                                        )}
                                                        {visit.status === 'cancelled' && (
                                                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Denegada</span>
                                                        )}
                                                    </div>

                                                    {visit.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await updateDoc(doc(db, "visits", visit.id), { status: 'confirmed' });
                                                                        setVisits(prev => prev.map(v => v.id === visit.id ? { ...v, status: 'confirmed' } : v));
                                                                        toast.success("Visita aprobada");
                                                                    } catch (err) { toast.error("Error al aprobar"); }
                                                                }}
                                                                className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-green-200"
                                                            >
                                                                Aprobar
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await updateDoc(doc(db, "visits", visit.id), { status: 'cancelled' });
                                                                        setVisits(prev => prev.map(v => v.id === visit.id ? { ...v, status: 'cancelled' } : v));
                                                                        toast.error("Visita denegada");
                                                                    } catch (err) { toast.error("Error al denegar"); }
                                                                }}
                                                                className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-red-200"
                                                            >
                                                                Denegar
                                                            </button>
                                                        </div>
                                                    )}

                                                    {visit.status === 'confirmed' && !visit.outcome && (
                                                        <div className="flex flex-col gap-2 items-end mt-2">
                                                            <button
                                                                onClick={() => setVisitToContract(visit)}
                                                                className="bg-[#fc7f51] text-white hover:bg-[#e56b3e] shadow-md px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 w-full md:w-auto"
                                                            >
                                                                <FileText className="w-4 h-4" /> Generar Contrato
                                                            </button>
                                                            <label className="cursor-pointer border-2 border-dashed border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-400 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 w-full md:w-auto">
                                                                <Upload className="w-4 h-4" /> Subir Borrador
                                                                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleUploadDraft(visit, e.target.files[0])} />
                                                            </label>
                                                        </div>
                                                    )}

                                                    {visit.contractDraftUrl && (
                                                        <a href={visit.contractDraftUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2">
                                                            <FileText className="w-3 h-3" /> Ver Borrador
                                                        </a>
                                                    )}

                                                    {visit.outcome === 'tomó la propiedad' && (
                                                        <div className="flex flex-col items-end gap-2 mt-2 w-full">
                                                            <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs flex items-center justify-center gap-1 w-full text-center">
                                                                <CheckCircle2 className="w-4 h-4" /> Contrato cerrado ({visit.outcomeDetails?.documentType})
                                                            </span>
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm('¿Seguro que deseas deshacer el contrato? La reserva quedará abierta nuevamente.')) {
                                                                        try {
                                                                            await updateDoc(doc(db, "visits", visit.id), {
                                                                                outcome: null,
                                                                                outcomeDetails: null
                                                                            });
                                                                            setVisits(prev => prev.map(v => v.id === visit.id ? { ...v, outcome: null, outcomeDetails: null } : v));
                                                                            toast.success('Estado revertido. Ahora puedes editar la propiedad o generar otro contrato.');
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                            toast.error('Error al deshacer el estado');
                                                                        }
                                                                    }
                                                                }}
                                                                className="text-xs text-red-500 font-bold underline hover:text-red-700 transition"
                                                            >
                                                                Deshacer Proceso
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TEMPLATES TAB */}
                        {activeTab === 'templates' && (
                            <ContractTemplates userId={user.uid} />
                        )}

                        {/* TIPS TAB */}
                        {activeTab === 'tips' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Create Tip Form */}
                                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 h-fit">
                                    <div className="bg-[#16151a] p-6 text-white">
                                        <h2 className="text-xl font-bold">{editingTipId ? 'Editar Tip' : 'Nuevo Tip'}</h2>
                                    </div>
                                    <form onSubmit={handleTipSubmit} className="p-8 space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Título del Tip</label>
                                            <input required type="text" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" value={tipForm.title} onChange={e => setTipForm({ ...tipForm, title: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Contenido</label>
                                            <textarea required className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none h-40 resize-none" value={tipForm.content} onChange={e => setTipForm({ ...tipForm, content: e.target.value })}></textarea>
                                        </div>

                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                            <input type="file" accept="image/*" onChange={(e) => setTipImage(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <p className="text-sm text-gray-500">{tipImage ? tipImage.name : 'Subir Imagen (Opcional)'}</p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button type="submit" disabled={loadingTips} className="flex-1 bg-[#fc7f51] text-white font-bold py-3 rounded-xl hover:bg-[#e56b3e] transition">
                                                {loadingTips ? <Loader2 className="animate-spin mx-auto" /> : (editingTipId ? 'Actualizar Tip' : 'Publicar Tip')}
                                            </button>
                                            {editingTipId && (
                                                <button type="button" onClick={() => { setEditingTipId(null); setTipForm({ title: '', content: '' }); setTipImage(null); }} className="px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition">
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>

                                {/* My Tips List */}
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Mis Tips Publicados</h2>
                                    {tips.length === 0 ? (
                                        <p className="text-gray-500">No has publicado tips aún.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {tips.map(tip => (
                                                <div key={tip.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                                                    {tip.imageUrl && (
                                                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                                                            <img src={tip.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="flex-grow">
                                                        <h3 className="font-bold text-gray-800">{tip.title}</h3>
                                                        <p className="text-sm text-gray-500 line-clamp-2">{tip.content}</p>
                                                        <p className="text-xs text-gray-400 mt-2">Publicado: {tip.createdAt?.toDate ? tip.createdAt.toDate().toLocaleDateString() : 'Reciente'}</p>
                                                        <div className="mt-2 flex gap-2">
                                                            <button onClick={() => handleEditTip(tip)} className="text-blue-500 text-xs font-bold hover:underline">Editar</button>
                                                            <button onClick={() => handleDeleteTip(tip.id)} className="text-red-500 text-xs font-bold hover:underline">Eliminar</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
                }
            </div >

            {/* Visit Slot Manager Modal */}
            {showSlotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-[#16151a] p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold">Gestionar Horarios: {slotPropertyTitle}</h3>
                            <button onClick={() => setShowSlotModal(false)} className="hover:bg-gray-700 p-1 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-2 mb-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                                    <input type="date" className="w-full border p-2 rounded-lg" value={newSlotDate} onChange={e => setNewSlotDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Hora</label>
                                    <input type="time" className="w-full border p-2 rounded-lg" value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={addSlot} className="bg-[#fc7f51] text-white p-2 rounded-lg font-bold hover:bg-[#e56b3e]">Agg</button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto mb-4 custom-scrollbar">
                                {currentSlots.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center italic">No hay horarios disponibles.</p>
                                ) : (
                                    currentSlots.map(slot => (
                                        <div key={slot.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <span className="text-sm font-bold text-gray-700">{slot.date} - {slot.time}</span>
                                            <button onClick={() => removeSlot(slot.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button onClick={saveSlots} className="w-full bg-[#16151a] text-white font-bold py-3 rounded-xl hover:bg-black transition">Guardar Horarios</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Crop Modal */}
            {cropImageUrl && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col items-center">
                        <h3 className="text-xl font-bold mb-4 w-full flex justify-between">
                            Recortar Imagen
                            <button onClick={() => setCropImageUrl(null)} className="text-gray-500 hover:text-black">
                                <X className="w-6 h-6" />
                            </button>
                        </h3>
                        <div className="max-h-[60vh] overflow-y-auto w-full flex justify-center bg-gray-100 rounded-lg">
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                            >
                                <img
                                    ref={imgRef}
                                    src={cropImageUrl}
                                    alt="Crop me"
                                    onLoad={(e) => {
                                        // Center crop on load
                                        const { width, height } = e.currentTarget;
                                        setCrop({
                                            unit: '%',
                                            width: 80,
                                            aspect: crop.aspect,
                                            x: 10,
                                            y: 10
                                        });
                                    }}
                                    className="max-w-full h-auto object-contain"
                                />
                            </ReactCrop>
                        </div>
                        <div className="flex gap-4 w-full mt-6">
                            <button
                                onClick={() => setCrop({ ...crop, aspect: 16 / 9 })}
                                className={`px-4 py-2 rounded-lg font-bold text-sm ${crop.aspect === 16 / 9 ? 'bg-[#fc7f51] text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                16:9 Panorámico
                            </button>
                            <button
                                onClick={() => setCrop({ ...crop, aspect: 1 })}
                                className={`px-4 py-2 rounded-lg font-bold text-sm ${crop.aspect === 1 ? 'bg-[#fc7f51] text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                1:1 Cuadrado
                            </button>
                            <button
                                onClick={() => setCrop({ ...crop, aspect: undefined })}
                                className={`px-4 py-2 rounded-lg font-bold text-sm ${crop.aspect === undefined ? 'bg-[#fc7f51] text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                Libre
                            </button>

                            <div className="ml-auto flex gap-2">
                                <button
                                    onClick={() => setCropImageUrl(null)}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveCrop}
                                    className="px-6 py-2 bg-[#1877F2] text-white font-bold rounded-lg hover:bg-[#166FE5]"
                                >
                                    Guardar Recorte
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Contract Loading / Modals */}
            {visitToContract && (
                <GenerateContractModal
                    visit={visitToContract}
                    agent={user}
                    onClose={() => setVisitToContract(null)}
                    onContractsUpdated={() => {
                        // Optimistically update visit list to show outcome
                        setVisits(prev => prev.map(v => v.id === visitToContract.id ? { ...v, outcome: 'tomó la propiedad', outcomeDetails: { documentType: 'creado' } } : v));
                    }}
                />
            )}
        </div>
    );
};

export default AgentDashboard;
