import React, { useState, useEffect, useRef } from 'react';
import { Project, projectService } from '../../services/projectService';
import { 
  World, 
  getWorldServiceInstance, 
  createMainWorld, 
  createProjectWorld,
  WorldObject
} from '../../data/worlds';
import { useWorld } from '../../context/WorldContext';
import '../../styles/modernAdmin.css';
import ViewWorldButton from './ViewWorldButton';
import useMobileDetection from '../../hooks/useMobileDetection'; // Import the hook

interface ProjectFormData {
  name: string;
  description: string;
  link: string;
  thumbnail: string;
  status: 'completed' | 'in-progress';
  type: 'standard' | 'video';
  videoUrl?: string;
  customLink?: string; // Custom URL path for direct access
  worldSettings: {
    backgroundColor: string;
    floorColor: string;
    skyColor: string;
    floorTexture?: string; // Added for floor texture URL
    skyTexture?: string;   // Added for sky texture URL
    ambientLightColor: string;
    ambientLightIntensity: number;
    directionalLightColor: string;
    directionalLightIntensity: number;
  };
}

interface MediaFormData {
  id?: string;  // Add optional id field to fix TypeScript errors
  title: string;
  description: string;
  type: 'image' | 'video' | 'pdf' | 'link';  // Add 'link' to match the WorldObject type
  url: string;
  position: [number, number, number];
  file?: File;
}

interface FileUploadPreview {
  name: string;
  size: number;
  url: string;
  type: string;
}

// Debug dialog interface
interface DebugInfo {
  isVisible: boolean;
  title: string;
  message: string;
  data?: any;
  type: 'info' | 'success' | 'error' | 'warning';
  customActions?: Array<{
    label: string;
    action: () => void;
    type: 'primary' | 'warning' | 'danger'
  }>;
}

// Define consistent storage key and world ID format
const STORAGE_KEY = 'portfolio_worlds';
const getWorldId = (projectId: number): string => {
  return `project-world-${projectId}`;
};

interface ModernAdminDashboardProps {
  onLogout: () => void;
}

// Function to generate positions in a circular arrangement
const generateCircularPositions = (count: number, centerY: number = 2): [number, number, number][] => {
  const positions: [number, number, number][] = [];
  const radius = 8;
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    positions.push([x, centerY, z]);
  }
  
  return positions;
};

export const ModernAdminDashboard = ({ onLogout }: ModernAdminDashboardProps) => {
  // Get the world service from context
  const { refreshWorlds } = useWorld();
  const { isTouchDevice } = useMobileDetection(); // Use the hook
  
  // State for UI
  const [activeTab, setActiveTab] = useState('projects');
  const [activeSubTab, setActiveSubTab] = useState('list');
  const [projects, setProjects] = useState<Project[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Main scene settings state
  const [mainSceneSettings, setMainSceneSettings] = useState({
    backgroundColor: '#ffffff',
    floorColor: '#ffffff',
    skyColor: '#ffffff',
    ambientLightColor: '#ffffff',
    ambientLightIntensity: 0.8,
    directionalLightColor: '#ffffff',
    directionalLightIntensity: 1.2
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [initError, setInitError] = useState<Error | null>(null);
  const [projectMedia, setProjectMedia] = useState<MediaFormData[]>([]);
  const [fileUploadPreview, setFileUploadPreview] = useState<FileUploadPreview | null>(null);
  const [editingMediaIndex, setEditingMediaIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    isVisible: false,
    title: '',
    message: '',
    data: null,
    type: 'info',
    customActions: []
  });
  
  // Project form state
  const [projectForm, setProjectForm] = useState<ProjectFormData>({
    name: '',
    description: '',
    link: '',
    thumbnail: '',
    status: 'completed',
    type: 'standard',
    videoUrl: '',
    customLink: '',
    worldSettings: {
      backgroundColor: '#000000',
      floorColor: '#444444',
      skyColor: '#111111',
      floorTexture: '', // Initialize floorTexture
      skyTexture: '',   // Initialize skyTexture
      ambientLightColor: '#ffffff',
      ambientLightIntensity: 0.5,
      directionalLightColor: '#ffffff',
      directionalLightIntensity: 0.8
    }
  });
  
  // Media form state
  const [mediaForm, setMediaForm] = useState<MediaFormData>({
    title: '',
    description: '',
    type: 'image',
    url: '',
    position: [0, 2, 0]
  });

  // Project service
  const projectServiceInstance = useRef(projectService);

  // Prevent unnecessary re-renders
  const currentProjectService = projectServiceInstance.current;
  
  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  
  // Form data
  const [projectFormData, setProjectFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    link: '',
    thumbnail: '',
    status: 'completed',
    type: 'standard',
    videoUrl: '',
    customLink: '',
    worldSettings: {
      backgroundColor: '#000000',
      floorColor: '#151515', // Default floor color was different here, harmonizing with projectForm for now
      skyColor: '#000000',   // Default sky color was different here, harmonizing with projectForm for now
      floorTexture: '', // Initialize floorTexture
      skyTexture: '',   // Initialize skyTexture
      ambientLightColor: '#ffffff',
      ambientLightIntensity: 0.8,
      directionalLightColor: '#ffffff',
      directionalLightIntensity: 1.2
    }
  });
  
  // Sync projectForm and projectFormData
  useEffect(() => {
    // Only update projectForm if projectFormData changes
    if (JSON.stringify(projectForm) !== JSON.stringify(projectFormData)) {
      setProjectForm({...projectFormData});
    }
  }, [projectFormData]);
  
  useEffect(() => {
    // This useEffect was previously syncing projectFormData FROM projectForm.
    // It is now disabled to prevent potential data reversion issues,
    // as projectFormData should primarily be derived from selectedProject and worlds state.
    // The primary data flow is: selectedProject/worlds -> projectFormData -> projectForm.
    // if (JSON.stringify(projectFormData) !== JSON.stringify(projectForm)) {
    //   // console.log('[SYNC_EFFECT_DEBUG] Syncing projectFormData FROM projectForm', projectForm);
    //   // setProjectFormData({...projectForm});
    // }
  }, [projectForm]); // Dependency array remains the same
  
  const [mediaFormData, setMediaFormData] = useState<MediaFormData>({
    title: '',
    description: '',
    type: 'image',
    url: '',
    position: [0, 2, 0]
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Mock data URLs for demo purposes
  const mockImages = [
    'https://picsum.photos/seed/img1/800/600',
    'https://picsum.photos/seed/img2/800/600',
    'https://picsum.photos/seed/img3/800/600',
    'https://picsum.photos/seed/img4/800/600',
    'https://picsum.photos/seed/img5/800/600'
  ];
  
  const mockPDFs = [
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'https://www.africau.edu/images/default/sample.pdf'
  ];
  
  const mockVideos = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    'https://www.youtube.com/watch?v=ZSt9tm3RoUU'
  ];
  
  // Show debug info
  const showDebugInfo = (
    title: string, 
    message: string, 
    data?: any, 
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
    customActions?: Array<{
      label: string;
      action: () => void;
      type: 'primary' | 'warning' | 'danger'
    }>
  ) => {
    setDebugInfo({
      isVisible: true,
      title,
      message,
      data,
      type,
      customActions
    });
  };
  
  // Initialize data function
  const initializeData = async () => {
    try {
      console.log('Initializing data...');
      setIsLoading(true);
      setInitError(null);
      
      // CRITICAL FIX: Force refresh the world service first
      console.log('Force refreshing world service before loading data...');
      const worldService = getWorldServiceInstance();
      worldService.clearAllWorlds();
      worldService.reloadWorlds();
      
      // Set a timeout to force loading to complete after 15 seconds
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.warn('Loading timeout reached, forcing completion');
          setIsLoading(false);
          setErrorMessage('Loading timed out. Some data may not be available.');
        }
      }, 15000);
      
      let loadedProjects: Project[] = [];
      
      // Load projects
      try {
        loadedProjects = await projectService.getProjects();
        console.log('Loaded projects:', loadedProjects);
        setProjects(loadedProjects);
      } catch (projectError) {
        console.error('Error loading projects:', projectError);
        // Continue with empty projects array
        setProjects([]);
      }
      
      // Load worlds
      try {
        const worldService = getWorldServiceInstance();
        const loadedWorlds = worldService.getAllWorlds();
        console.log('Loaded worlds:', loadedWorlds);
        setWorlds(loadedWorlds);
        
        // Sync projects and worlds - create worlds for projects that don't have one
        loadedProjects.forEach((project: Project) => {
          const worldId = getWorldId(project.id);
          const hasWorld = loadedWorlds.some(world => world.id === worldId);
          
          if (!hasWorld) {
            console.log(`Creating missing world for project: ${project.name} (ID: ${project.id})`);
            // Create default world for this project
            const newWorld = {
              id: worldId,
              name: project.name,
              description: project.description,
              backgroundColor: project.worldSettings?.backgroundColor || '#000000',
              floorColor: project.worldSettings?.floorColor || '#222222',
              skyColor: project.worldSettings?.skyColor || '#111111',
              ambientLightColor: project.worldSettings?.ambientLightColor || '#ffffff',
              ambientLightIntensity: project.worldSettings?.ambientLightIntensity || 0.5,
              directionalLightColor: project.worldSettings?.directionalLightColor || '#ffffff',
              directionalLightIntensity: project.worldSettings?.directionalLightIntensity || 0.8,
              objects: [
                {
                  id: `back-button-${project.id}`,
                  type: 'button' as const,
                  title: 'Back to Hub',
                  position: [-8, 2, 0] as [number, number, number],
                  action: 'navigate' as const,
                  destination: 'hub'
                },
                {
                  id: `project-card-${project.id}`,
                  type: 'project' as const,
                  title: project.name,
                  description: project.description,
                  thumbnail: project.thumbnail,
                  projectId: project.id,
                  position: [0, 4, 0] as [number, number, number]
                }
              ]
            };
            
            worldService.updateWorld(newWorld);
          }
        });
        
        // Refresh worlds to get the newly created ones
        refreshWorlds();
      } catch (worldError) {
        console.error('Error loading worlds:', worldError);
        // Continue with empty worlds array
        setWorlds([]);
      }
      
      // Clear the timeout since loading completed
      clearTimeout(timeoutId);
      
      // CRITICAL FIX: Force synchronization of mainWorld with projects
      try {
        await syncMainWorldWithProjects();
        console.log('Initial synchronization of mainWorld with projects completed successfully');
      } catch (syncError) {
        console.error('Error during initial mainWorld synchronization:', syncError);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing data:', error);
      setInitError(error instanceof Error ? error : new Error('Unknown initialization error'));
      setIsLoading(false);
      
      // Show error in debug info
      showDebugInfo(
        'Initialization Error',
        'Failed to initialize the admin dashboard. See details below.',
        error,
        'error',
        [
          {
            label: 'Retry',
            action: () => initializeData(),
            type: 'primary'
          }
        ]
      );
    }
  };
  
  // Call initializeData on component mount
  useEffect(() => {
    console.log('ModernAdminDashboard mounted');
    initializeData();
    
    // Load main scene settings on mount
    loadMainSceneSettings();
    
    // Cleanup on unmount
    return () => {
      console.log('ModernAdminDashboard unmounting');
    };
  }, []); // Empty dependency array for initial mount only
  
  // When active tab changes, handle necessary updates
  // Function to load main scene settings
  const loadMainSceneSettings = () => {
    try {
      const worldService = getWorldServiceInstance();
      const mainWorld = worldService.getWorld('mainWorld');
      
      if (mainWorld) {
        setMainSceneSettings({
          backgroundColor: mainWorld.backgroundColor || '#ffffff',
          floorColor: mainWorld.floorColor || '#ffffff',
          skyColor: mainWorld.skyColor || '#ffffff',
          ambientLightColor: mainWorld.ambientLightColor || '#ffffff',
          ambientLightIntensity: mainWorld.ambientLightIntensity || 0.8,
          directionalLightColor: mainWorld.directionalLightColor || '#ffffff',
          directionalLightIntensity: mainWorld.directionalLightIntensity || 1.2
        });
        console.log('Loaded main scene settings:', mainWorld);
      } else {
        console.warn('Main world not found when loading settings');
      }
    } catch (error) {
      console.error('Error loading main scene settings:', error);
    }
  };

  useEffect(() => {
    // Avoid unnecessary processing on initial render
    if (activeTab === 'projects' && projects.length === 0) {
      // This is likely the initial load, already handled by loadData
      return;
    }
    
    console.log(`Switched to ${activeTab} tab`);
    
    // Only refresh worlds list when viewing the worlds tab
    // to avoid unnecessary state updates
    if (activeTab === 'worlds') {
      const service = getWorldServiceInstance();
      const allWorlds = service.getAllWorlds();
      setWorlds(allWorlds);
    }
    
    // Load main scene settings when switching to that tab
    if (activeTab === 'projects' && activeSubTab === 'mainscene') {
      loadMainSceneSettings();
    }
  }, [activeTab, activeSubTab, projects.length]);
  
  // Reset project form function
  const resetProjectForm = () => {
    const defaultFormData = {
      name: '',
      description: '',
      link: '',
      thumbnail: '',
      status: 'completed' as const,
      type: 'standard' as const,
      videoUrl: '',
      customLink: '',
      worldSettings: {
        backgroundColor: '#000000',
        floorColor: '#444444',
        skyColor: '#111111',
        floorTexture: '', // Initialize floorTexture
        skyTexture: '',   // Initialize skyTexture
        ambientLightColor: '#ffffff',
        ambientLightIntensity: 0.5,
        directionalLightColor: '#ffffff',
        directionalLightIntensity: 0.8
      }
    };
    
    // Update both state variables to ensure they're in sync
    setProjectFormData(defaultFormData);
    setProjectForm(defaultFormData);
    
    // Clear media
    setProjectMedia([]);
    setEditingMediaIndex(null);
    setFileUploadPreview(null);
  };
  
  // Update project form when selected project changes
  useEffect(() => {
    if (selectedProject) {
      // Find the corresponding world for this project
      const projectWorld = worlds.find(w => w.id === `project-world-${selectedProject.id}`);
      
      console.log('Found project world:', projectWorld);
      
      setProjectFormData({
        name: selectedProject.name,
        description: selectedProject.description,
        link: selectedProject.link,
        thumbnail: selectedProject.thumbnail,
        status: selectedProject.status,
        type: selectedProject.type,
        videoUrl: selectedProject.videoUrl || '',
        customLink: selectedProject.customLink || '',
        worldSettings: {
          backgroundColor: projectWorld?.backgroundColor || '#000000',
          floorColor: projectWorld?.floorColor || '#151515',
          skyColor: projectWorld?.skyColor || '#000000',
          floorTexture: projectWorld?.floorTexture || '', // Initialize floorTexture
          skyTexture: projectWorld?.skyTexture || '',   // Initialize skyTexture
          ambientLightColor: projectWorld?.ambientLightColor || '#ffffff',
          ambientLightIntensity: projectWorld?.ambientLightIntensity || 0.8,
          directionalLightColor: projectWorld?.directionalLightColor || '#ffffff',
          directionalLightIntensity: projectWorld?.directionalLightIntensity || 1.2
        }
      });
      
      // Extract media from the world
      if (projectWorld) {
        // Extract media from the world
        const mediaObjects = projectWorld.objects
          .filter(obj => ['image', 'video', 'pdf'].includes(obj.type))
          .map(obj => ({
            title: obj.title,
            description: obj.description || '',
            type: obj.type as 'image' | 'video' | 'pdf',
            url: obj.url || '',
            position: obj.position || [0, 2, 0]
          }));
        
        console.log('Found media objects:', mediaObjects);
        setProjectMedia(mediaObjects);
      } else {
        // If no world exists yet, let's populate with some mock data
        console.log('No project world found, populating with mock data');
        populateWithMockMedia();
      }
    } else {
      resetProjectForm();
    }
  }, [selectedProject, worlds]);
  
  // Populate with mock media for demo purposes
  const populateWithMockMedia = () => {
    const mockMediaData: MediaFormData[] = [
      {
        title: "Project Screenshot 1",
        description: "Main project visualization",
        type: "image",
        url: mockImages[0],
        position: [5, 2, 3]
      },
      {
        title: "Project Video Demo",
        description: "Video demonstration of features",
        type: "video",
        url: mockVideos[0],
        position: [-5, 2, 3]
      },
      {
        title: "Technical Documentation",
        description: "PDF with technical specifications",
        type: "pdf",
        url: mockPDFs[0],
        position: [0, 2, -5]
      },
      {
        title: "User Guide",
        description: "PDF with user instructions",
        type: "pdf",
        url: mockPDFs[1],
        position: [5, 2, -3]
      },
      {
        title: "Product Screenshot 2",
        description: "Additional project visualization",
        type: "image",
        url: mockImages[1],
        position: [-5, 2, -3]
      }
    ];
    
    setProjectMedia(mockMediaData);
  };
  
  // Handle project form changes
  const handleProjectFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProjectFormData({
      ...projectFormData,
      [name]: value
    });
  };
  
  // Handle world settings changes
  const handleWorldSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const [settingGroup, settingName] = name.split('.'); // e.g., "worldSettings.backgroundColor"

    if (settingGroup === 'worldSettings') {
      setProjectForm(prev => ({
        ...prev,
        worldSettings: {
          ...prev.worldSettings,
          [settingName]: type === 'number' ? parseFloat(value) : value
        }
      }));
    }
  };
  
  // Handle main scene settings changes
  const handleMainSceneSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    setMainSceneSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };
  
  // Save main scene settings
  const saveMainSceneSettings = async () => {
    try {
      setIsSaving(true);
      
      const worldService = getWorldServiceInstance();
      let mainWorld = worldService.getWorld('mainWorld');
      
      if (!mainWorld) {
        console.log('Main world not found, creating new one');
        // Get current projects
        const currentProjects = await projectService.getProjects();
        mainWorld = createMainWorld(currentProjects);
      }
      
      // Update main world with current settings
      mainWorld = {
        ...mainWorld,
        backgroundColor: mainSceneSettings.backgroundColor,
        floorColor: mainSceneSettings.floorColor,
        skyColor: mainSceneSettings.skyColor,
        ambientLightColor: mainSceneSettings.ambientLightColor,
        ambientLightIntensity: mainSceneSettings.ambientLightIntensity,
        directionalLightColor: mainSceneSettings.directionalLightColor,
        directionalLightIntensity: mainSceneSettings.directionalLightIntensity
      };
      
      // Save the main world
      worldService.updateWorld(mainWorld);
      
      // Refresh worlds
      refreshWorlds();
      
      setSuccessMessage('Main scene settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving main scene settings:', error);
      setErrorMessage(`Failed to save main scene settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Improved function to handle media form changes
  const handleMediaFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Create a new object to avoid reference issues
    const updatedMediaFormData = {...mediaFormData};
    
    if (name === 'positionX' || name === 'positionY' || name === 'positionZ') {
      // Create a new position array to avoid reference issues
      const position = [...mediaFormData.position] as [number, number, number];
      
      // Update the appropriate position coordinate
      if (name === 'positionX') position[0] = parseFloat(value) || 0;
      if (name === 'positionY') position[1] = parseFloat(value) || 0;
      if (name === 'positionZ') position[2] = parseFloat(value) || 0;
      
      // Update the position in the new object
      updatedMediaFormData.position = position;
    } else if (name === 'type') {
      // Handle type field specifically since it has a specific set of allowed values
      updatedMediaFormData.type = value as 'image' | 'video' | 'pdf';
    } else if (name === 'title' || name === 'description' || name === 'url') {
      // Handle string fields
      updatedMediaFormData[name] = value;
    }
    
    // Update both state variables to ensure they're in sync
    setMediaFormData(updatedMediaFormData);
    setMediaForm({...updatedMediaFormData});
    
    console.log('Updated media form data:', updatedMediaFormData);
  };
  
  // Improved function to handle file change for media uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      setErrorMessage(`File size exceeds 10MB limit. Please choose a smaller file.`);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    console.log('File selected:', file.name, file.type, formatFileSize(file.size));
    
    // Create a URL for the file preview
    const fileUrl = URL.createObjectURL(file);
    
    // Update the file upload preview
    setFileUploadPreview({
      name: file.name,
      size: file.size,
      url: fileUrl,
      type: file.type
    });
    
    // Determine the media type based on the file type
    let mediaType: 'image' | 'video' | 'pdf' = 'image';
    
    if (file.type.startsWith('image/')) {
      mediaType = 'image';
    } else if (file.type.startsWith('video/')) {
      mediaType = 'video';
    } else if (file.type === 'application/pdf') {
      mediaType = 'pdf';
    } else {
      console.warn(`Unsupported file type: ${file.type}, defaulting to image`);
    }
    
    // Create updated media form data
    const updatedMediaFormData = {
      ...mediaFormData,
      url: fileUrl,
      type: mediaType
    };
    
    // Update both state variables to ensure they're in sync
    setMediaFormData(updatedMediaFormData);
    setMediaForm({...updatedMediaFormData});
    
    // Store the file for later upload
    setSelectedFile(file);
    
    console.log('Updated media form data with file:', updatedMediaFormData);
  };
  
  // Trigger file input click
  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Improved function to clear file upload preview
  const handleClearFileUpload = () => {
    console.log('Clearing file upload');
    
    // Revoke the object URL to prevent memory leaks
    if (fileUploadPreview?.url) {
      URL.revokeObjectURL(fileUploadPreview.url);
    }
    
    // Clear the file upload preview
    setFileUploadPreview(null);
    
    // Clear the selected file
    setSelectedFile(null);
    
    // Reset the file input field
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // If the URL was from a file upload, clear it from the media form data
    if (mediaFormData.url && mediaFormData.url.startsWith('blob:')) {
      const updatedMediaFormData = {
        ...mediaFormData,
        url: ''
      };
      
      // Update both state variables to ensure they're in sync
      setMediaFormData(updatedMediaFormData);
      setMediaForm({...updatedMediaFormData});
    }
  };
  
  // Improved function to validate and normalize URLs based on media type
  const validateAndNormalizeUrl = (url: string, type: string = ''): string => {
    if (!url) return '';
    
    // Trim the URL to remove any whitespace
    url = url.trim();
    
    // If it's a data URL or blob URL, return as is
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    
    // If it's an absolute URL, ensure it has the correct protocol
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // For YouTube videos, ensure they're in the correct format
      if (type === 'video' && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        // Convert youtu.be links to youtube.com
        if (url.includes('youtu.be')) {
          const videoId = url.split('/').pop();
          if (videoId) {
            return `https://www.youtube.com/watch?v=${videoId}`;
          }
        }
        
        // Ensure youtube.com links have the watch?v= format
        if (url.includes('youtube.com') && !url.includes('watch?v=')) {
          try {
            const urlObj = new URL(url);
            const videoId = urlObj.pathname.split('/').pop();
            if (videoId) {
              return `https://www.youtube.com/watch?v=${videoId}`;
            }
          } catch (error) {
            console.error('Error parsing YouTube URL:', error);
          }
        }
      }
      
      return url;
    }
    
    // If it's a relative URL, convert to absolute
    if (url.startsWith('/')) {
      return window.location.origin + url;
    }
    
    // Special handling for YouTube videos
    if (type === 'video' && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      if (url.includes('youtu.be')) {
        const videoId = url.split('/').pop();
        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
    }
    
    // If no protocol, add https://
    if (!url.includes('://')) {
      return 'https://' + url;
    }
    
    return url;
  };
  
  // Update the handleAddProjectMedia function to validate and normalize URLs
  const handleAddProjectMedia = () => {
    if (!mediaFormData.title) {
      setErrorMessage('Media title is required');
      return;
    }
    
    // Get the URL from file upload or direct URL input
    let mediaUrl = mediaFormData.url;
    
    if (fileUploadPreview) {
      mediaUrl = fileUploadPreview.url;
    }
    
    // Validate and normalize the URL
    mediaUrl = validateAndNormalizeUrl(mediaUrl, mediaFormData.type);
    
    if (!mediaUrl) {
      setErrorMessage('Media URL is required');
      return;
    }
    
    console.log('Adding/updating media with URL:', mediaUrl);
    
    // Create the media item with proper typing and ensure position is properly formatted
    const position: [number, number, number] = Array.isArray(mediaFormData.position) && 
                                              mediaFormData.position.length === 3 ? 
      [mediaFormData.position[0], mediaFormData.position[1], mediaFormData.position[2]] : 
      [0, 2, 0];
    
    const mediaItem: MediaFormData = {
      title: mediaFormData.title,
      description: mediaFormData.description || '',
      type: mediaFormData.type,
      url: mediaUrl,
      position: position
    };
    
    // Create a new media list to avoid reference issues
    let newMediaList: MediaFormData[];
    
    // If editing an existing media item, update it
    if (editingMediaIndex !== null && editingMediaIndex >= 0 && editingMediaIndex < projectMedia.length) {
      newMediaList = [...projectMedia];
      newMediaList[editingMediaIndex] = {...mediaItem};
      console.log('Updated media at index', editingMediaIndex, 'New media list:', newMediaList);
      setSuccessMessage('Media updated successfully');
    } else {
      // Add new media item
      newMediaList = [...projectMedia, {...mediaItem}];
      console.log('Added new media item. New media list:', newMediaList);
      setSuccessMessage('Media added successfully');
    }
    
    // Update the state with the new media list
    setProjectMedia(newMediaList);
    
    // Reset the form
    resetMediaForm();
    
    // If we have a selected project, save the project to update the world
    if (selectedProject) {
      console.log('Auto-saving project after media change');
      
      // Force refresh the world service before saving to ensure fresh data
      try {
        const worldService = getWorldServiceInstance();
        worldService.clearAllWorlds();
        worldService.reloadWorlds();
        refreshWorlds();
        console.log('World service refreshed before saving media');
      } catch (error) {
        console.error('Error refreshing world service:', error);
      }
      
      // Use setTimeout to ensure state updates have completed
      setTimeout(() => {
        try {
          // Create a fake form event to trigger the save
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
          
          // Call handleSaveProject with the updated media list
          handleSaveProject(fakeEvent, newMediaList);
        } catch (error) {
          console.error('Error auto-saving project:', error);
          // Try again with a direct approach
          if (selectedProject) {
            saveDebugData(selectedProject.id);
          }
        }
      }, 500);
    }
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Improved function to remove media from the current project
  const handleRemoveProjectMedia = (index: number) => {
    if (index < 0 || index >= projectMedia.length) {
      console.error(`Invalid media index: ${index}`);
      return;
    }
    
    console.log(`Removing media at index ${index}`);
    
    // Create a new array without the removed media
    const updatedMedia = projectMedia.filter((_, i) => i !== index);
    
    // Update the state
    setProjectMedia(updatedMedia);
    
    // Show success message
    setSuccessMessage('Media removed successfully');
    
    // If we have a selected project, save the project to update the world
    if (selectedProject) {
      console.log('Auto-saving project after media removal');
      
      // Force refresh the world service before saving to ensure fresh data
      try {
        const worldService = getWorldServiceInstance();
        worldService.clearAllWorlds();
        worldService.reloadWorlds();
        refreshWorlds();
        console.log('World service refreshed before saving after media removal');
      } catch (error) {
        console.error('Error refreshing world service:', error);
      }
      
      // Use setTimeout to ensure state updates have completed
      setTimeout(() => {
        try {
          // Create a fake form event to trigger the save
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
          
          // Call handleSaveProject with the updated media list
          handleSaveProject(fakeEvent, updatedMedia);
        } catch (error) {
          console.error('Error auto-saving project after media removal:', error);
          // Try again with a direct approach
          if (selectedProject) {
            saveDebugData(selectedProject.id);
          }
        }
      }, 500);
    }
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  
  // Define a function to get or create the world service
  const getOrCreateWorldService = () => {
    // Use our global ensured service
    return getWorldServiceInstance();
  };

  // Update the handleSaveProject function
  const handleSaveProject = async (e: React.FormEvent<HTMLFormElement>, mediaListArg?: MediaFormData[]) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      console.log('[SAVE_PROJECT_DEBUG] Phase 1: Starting save. Current projectFormData:', {
        name: projectFormData.name,
        description: projectFormData.description,
        thumbnail: projectFormData.thumbnail,
        worldSettings: projectFormData.worldSettings
      });

      // Create a fresh FormData with the current UI state
      const submissionFormData = new FormData();
      
      // Always use the current projectFormData values directly instead of form element values
      if (isEditingProject && selectedProject) {
        submissionFormData.set('id', selectedProject.id.toString());
      }
      
      // Set all values from projectFormData, not form elements
      submissionFormData.set('name', projectFormData.name);
      submissionFormData.set('description', projectFormData.description);
      submissionFormData.set('link', projectFormData.link);
      submissionFormData.set('thumbnail', projectFormData.thumbnail);
      submissionFormData.set('status', projectFormData.status);
      submissionFormData.set('type', projectFormData.type);
      
      if (projectFormData.videoUrl) {
        submissionFormData.set('videoUrl', projectFormData.videoUrl);
      }
      
      if (projectFormData.customLink) {
        submissionFormData.set('customLink', projectFormData.customLink);
      }
      
      // Add world settings
      if (projectFormData.worldSettings) {
        submissionFormData.set('worldSettings', JSON.stringify(projectFormData.worldSettings));
      }
      
      console.log('[SAVE_PROJECT_DEBUG] Phase 2: Form data ready for submission. FormData values:');
      submissionFormData.forEach((value, key) => {
        console.log(`  ${key}:`, value);
      });
      
      // Process through project service - this saves to localStorage['portfolio_projects']
      const initialSavedProject = await projectService.handleFormSubmission(submissionFormData);
      
      console.log('[SAVE_PROJECT_DEBUG] Phase 3: Project initially saved to projectService:', {
        id: initialSavedProject.id,
        name: initialSavedProject.name,
        // description: initialSavedProject.description, // Keep log concise
        // thumbnail: initialSavedProject.thumbnail
      });

      // BEGIN: Construct and save mediaObjects with the project
      const actualMediaWorldObjects: WorldObject[] = [];
      const mediaToUse = mediaListArg || projectMedia; // projectMedia is the state from the form

      if (mediaToUse && mediaToUse.length > 0) {
        const circularPositions = generateCircularPositions(mediaToUse.length, 2);
        mediaToUse.forEach((media, index) => {
          // Ensure media.id is a string. If it's undefined or not a string, generate one.
          const mediaId = typeof media.id === 'string' ? media.id : `media-${initialSavedProject.id}-${index}`;
          actualMediaWorldObjects.push({
            id: mediaId,
            type: media.type as 'image' | 'video' | 'pdf' | 'link',
            title: media.title,
            description: media.description,
            url: media.url,
            position: media.position || circularPositions[index] || [0, 2, 0], // Use provided position or fallback
            // Ensure other WorldObject properties are mapped if they exist in MediaFormData
          });
        });
      }
      
      const projectWithMedia: Project = { 
        ...initialSavedProject, 
        mediaObjects: actualMediaWorldObjects 
      };

      // Save the project again, this time with mediaObjects included
      const savedProject = await projectService.saveProject(projectWithMedia);
      console.log('[SAVE_PROJECT_DEBUG] Phase 3.5: Project saved again with mediaObjects:', {
        id: savedProject.id,
        name: savedProject.name,
        mediaObjectsCount: savedProject.mediaObjects?.length
      });
      // END: Construct and save mediaObjects with the project
      
      // CRITICAL FIX: Ensure projectService data is properly saved by directly verifying localStorage
      try {
        const projectsJson = localStorage.getItem('portfolio_projects');
        if (projectsJson) {
          const storedProjects = JSON.parse(projectsJson);
          const storedProject = storedProjects.find((p: Project) => p.id === savedProject.id);
          
          if (storedProject) {
            console.log('[SAVE_PROJECT_DEBUG] Verified project saved in localStorage:', {
              id: storedProject.id,
              name: storedProject.name,
              description: storedProject.description,
              thumbnail: storedProject.thumbnail
            });
          } else {
            console.warn('[SAVE_PROJECT_DEBUG] Project not found in localStorage after save!');
            // CRITICAL FIX: Force direct save to localStorage if project not found
            const updatedProjects = storedProjects.concat([savedProject]);
            localStorage.setItem('portfolio_projects', JSON.stringify(updatedProjects));
            console.log('[SAVE_PROJECT_DEBUG] Forced direct save of project to localStorage');
          }
        } else {
          // CRITICAL FIX: If no projects found, create new array with this project
          localStorage.setItem('portfolio_projects', JSON.stringify([savedProject]));
          console.log('[SAVE_PROJECT_DEBUG] Created new projects array in localStorage');
        }
      } catch (e) {
        console.error('[SAVE_PROJECT_DEBUG] Error verifying project in localStorage:', e);
      }
      
      // 1. Get the latest projects from the projectService
      const latestProjects = await projectService.getProjects(); // This should now reflect the project with mediaObjects
      
      // Update our local projects state with the latest from localStorage
      setProjects(latestProjects); // Ensure this projects state is used if needed below
      
      // 2. Find the subworld for this project or create it if needed
      const worldService = getWorldServiceInstance();
      // Ensure we use the 'savedProject' which has mediaObjects for world creation/update
      let world = worldService.getWorld(`project-world-${savedProject.id}`);
      
      // If no existing world is found, create one using the project data that includes mediaObjects
      if (!world) {
        console.log('[SAVE_PROJECT_DEBUG] No existing project world found. Creating a new one for project ID:', savedProject.id);
        // createProjectWorld will now use savedProject.mediaObjects
        world = createProjectWorld(savedProject, isTouchDevice); 
      } else {
        // Update existing world properties from project data
        console.log('[SAVE_PROJECT_DEBUG] World project-world-' + savedProject.id + ' found. Overwriting its properties with latest data.');
        world.name = savedProject.name;
        world.description = savedProject.description;
        
        // Update world settings if available
        if (savedProject.worldSettings) {
          world.backgroundColor = savedProject.worldSettings.backgroundColor;
          world.floorColor = savedProject.worldSettings.floorColor;
          world.skyColor = savedProject.worldSettings.skyColor;
          world.ambientLightColor = savedProject.worldSettings.ambientLightColor;
          world.ambientLightIntensity = savedProject.worldSettings.ambientLightIntensity;
          world.directionalLightColor = savedProject.worldSettings.directionalLightColor;
          world.directionalLightIntensity = savedProject.worldSettings.directionalLightIntensity;
        }
        // The objects themselves will be rebuilt below using savedProject.mediaObjects
      }
      
      // 3. Update project-related objects in the world using savedProject.mediaObjects
      // This section now primarily uses savedProject.mediaObjects (which are actualMediaWorldObjects)
      // The projectCard is still relevant for the project world.
      console.log('[SAVE_PROJECT_DEBUG] Constructing project-card and using media from savedProject for world objects. Project:', {
        name: savedProject.name,
        mediaCount: savedProject.mediaObjects?.length
      });
        
      // Ensure the world has the correct project card
      const projectCard: WorldObject = {
        id: `project-card-${savedProject.id}`,
        type: 'project',
        title: savedProject.name,
        description: savedProject.description,
        thumbnail: savedProject.thumbnail,
        position: [0, 3, -10], // Position in front of the user
        projectId: savedProject.id
      };
        
      // Rebuild world objects completely fresh using media from the definitive savedProject
      // And add the back button that createProjectWorld would also add (if !isTouchDevice)
      const backButton: WorldObject = {
        id: `back-to-main-${savedProject.id}`,
        type: 'button',
        title: 'Back to Main World',
        description: 'Return to the main portfolio overview',
        action: 'navigate',
        destination: 'mainWorld',
        position: [0, 1.5, 5], 
        scale: [2, 1, 0.5]
      };

      world.objects = [
        projectCard,
        ...(savedProject.mediaObjects || []), // Use mediaObjects from the fully saved project
        backButton
      ];
      
      console.log('[SAVE_PROJECT_DEBUG] Saving world with fully reconstructed objects and latest data:', world);
      // Update the world in the service
      worldService.updateWorld(world);
      
      // CRITICAL FIX: Force direct save to localStorage
      try {
        const worldsJson = localStorage.getItem('portfolio_worlds');
        if (worldsJson) {
          const storedWorlds = JSON.parse(worldsJson);
          const worldIndex = storedWorlds.findIndex((w: World) => w.id === world.id);
          
          if (worldIndex !== -1) {
            // Update existing world
            storedWorlds[worldIndex] = world;
          } else {
            // Add new world
            storedWorlds.push(world);
          }
          
          // Save back to localStorage
          localStorage.setItem('portfolio_worlds', JSON.stringify(storedWorlds));
          console.log('[SAVE_PROJECT_DEBUG] Directly updated world in localStorage');
        } else {
          // Create new worlds array
          localStorage.setItem('portfolio_worlds', JSON.stringify([world]));
          console.log('[SAVE_PROJECT_DEBUG] Created new worlds array in localStorage');
        }
      } catch (e) {
        console.error('[SAVE_PROJECT_DEBUG] Error directly updating world in localStorage:', e);
      }
      
      // ---- START: Update project card in mainWorld ----
      // ---- MODIFIED: Replace complex update logic with a call to syncMainWorldWithProjects ----
      try {
        console.log('[SAVE_PROJECT_DEBUG] Calling syncMainWorldWithProjects to update mainWorld.');
        await syncMainWorldWithProjects();
        console.log('[SAVE_PROJECT_DEBUG] syncMainWorldWithProjects completed.');
      } catch (mainWorldSyncError) {
        console.error('[SAVE_PROJECT_DEBUG] Error calling syncMainWorldWithProjects:', mainWorldSyncError);
      }
      // ---- END: Update project card in mainWorld ----
      
      // ---- START: Final Refresh Sequence ----
      try {
        console.log('[SAVE_PROJECT_DEBUG] Entering final refresh sequence.');

        // Force a complete refresh of data across all sources
        console.log('[SAVE_PROJECT_DEBUG] Clearing and reloading all data sources');
        
        // Force clear localStorage caches to ensure fresh data
        console.log('[SAVE_PROJECT_DEBUG] Forcing WorldService to reload by ensuring its cache is marked as not loaded.');
        // Use the already instantiated worldService from above
        // worldService.clearAllWorlds();  // REMOVED - This was likely causing data loss
        
        // CRITICAL FIX: Explicitly call saveAllWorlds to ensure data is persisted
        // worldService.saveAllWorlds();   // REMOVED - updateWorld already saves. This was saving a cleared cache.
        // The worldService.updateWorld() calls earlier should have saved necessary changes.
        // The service will reload from localStorage if needed when getAllWorlds() is called.
        
        // Force reload from localStorage by fetching projects and worlds anew
        const freshProjects = await projectService.getProjects();
        const freshWorlds = worldService.getAllWorlds();
        
        console.log('[SAVE_PROJECT_DEBUG] Fresh data loaded:', {
          projectsCount: freshProjects.length,
          worldsCount: freshWorlds.length
        });
        
        // Update React state with fresh data
        setProjects(freshProjects);
        setWorlds(freshWorlds);
        console.log('[SAVE_PROJECT_DEBUG] React state updated with fresh data');
        
        // Update the freshly loaded project as the selected project
        const freshProject = freshProjects.find(p => p.id === savedProject.id);
        if (freshProject) {
          setSelectedProject(freshProject);
          // Ensure projectFormData is in sync with the freshly loaded project
          setProjectFormData({
            name: freshProject.name,
            description: freshProject.description,
            link: freshProject.link,
            thumbnail: freshProject.thumbnail,
            status: freshProject.status,
            type: freshProject.type,
            videoUrl: freshProject.videoUrl || '',
            customLink: freshProject.customLink || '',
            worldSettings: freshProject.worldSettings || {
              backgroundColor: '#000000',
              floorColor: '#444444',
              skyColor: '#111111',
              floorTexture: '', // Initialize floorTexture
              skyTexture: '',   // Initialize skyTexture
              ambientLightColor: '#ffffff',
              ambientLightIntensity: 0.5,
              directionalLightColor: '#ffffff',
              directionalLightIntensity: 0.8
            }
          });
        }
        
        // Force the WorldContext to refresh
        console.log('[SAVE_PROJECT_DEBUG] Triggering WorldContext refresh');
        refreshWorlds();
        
        // CRITICAL FIX: Double-check localStorage to ensure data was actually saved
        const finalCheck = {
          projects: localStorage.getItem('portfolio_projects'),
          worlds: localStorage.getItem('portfolio_worlds')
        };
        
        console.log('[SAVE_PROJECT_DEBUG] Final localStorage verification:', {
          projectsFound: !!finalCheck.projects,
          projectsSize: finalCheck.projects?.length || 0,
          worldsFound: !!finalCheck.worlds,
          worldsSize: finalCheck.worlds?.length || 0
        });
        
        // CRITICAL FIX: Force synchronization of main world with all projects
        try {
          await syncMainWorldWithProjects();
          console.log('[SAVE_PROJECT_DEBUG] Forced synchronization of mainWorld completed');
        } catch (syncError) {
          console.error('[SAVE_PROJECT_DEBUG] Error during mainWorld synchronization:', syncError);
        }

        // Signal success to the user
        setSuccessMessage('Project saved successfully!');
      } catch (refreshError) {
        console.error('[SAVE_PROJECT_DEBUG] Error during final refresh:', refreshError);
        setErrorMessage('Project was saved, but there was an error refreshing the data. Please reload the page.');
      }
      // ---- END: Final Refresh Sequence ----
      
    } catch (error) {
      console.error('Error saving project:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSaving(false);
    }
  };
  
  // CRITICAL FIX: Add function to force synchronization of mainWorld project cards
  const syncMainWorldWithProjects = async () => {
    try {
      console.log('Forcing synchronization of mainWorld project cards with current projects');
      
      // Get current projects
      const currentProjects = await projectService.getProjects();
      console.log(`Got ${currentProjects.length} projects to sync with mainWorld`);
      
      // Get main world
      const worldService = getWorldServiceInstance();
      let mainWorld = worldService.getWorld('mainWorld');
      
      // If mainWorld doesn't exist, create a new one
      if (!mainWorld) {
        console.log('MainWorld not found, creating new one with all projects');
        mainWorld = createMainWorld(currentProjects);
        worldService.updateWorld(mainWorld);
        return;
      }
      
      // Check if we have objects in mainWorld
      if (!mainWorld.objects) {
        console.error('MainWorld exists but has no objects array!');
        mainWorld.objects = [];
      }
      
      // Filter out existing project cards
      const nonProjectObjects = mainWorld.objects.filter(obj => obj.type !== 'project');
      
      // Create new project cards for all current projects
      const projectCards = currentProjects.map(project => {
        // Find existing position for this project if possible
        const existingCard = mainWorld.objects.find(obj => 
          obj.type === 'project' && 
          (obj.projectId === project.id || obj.id === `project-${project.id}`)
        );
        
        const position = existingCard?.position || [0, 2, 0];
        
        return {
          id: `project-${project.id}`,
          type: 'project' as const,
          title: project.name,
          description: project.description,
          thumbnail: project.thumbnail,
          position,
          projectId: project.id,
          subWorldId: `project-world-${project.id}`
        };
      });
      
      // Combine non-project objects with new project cards
      mainWorld.objects = [...nonProjectObjects, ...projectCards];
      
      console.log(`Updated mainWorld with ${projectCards.length} project cards and ${nonProjectObjects.length} other objects`);
      
      // Save updated mainWorld
      worldService.updateWorld(mainWorld);
      
      // Ensure changes are saved to localStorage
      worldService.saveAllWorlds();
      
      // Refresh worlds context
      refreshWorlds();
      
      console.log('MainWorld synchronization complete');
    } catch (error) {
      console.error('Error synchronizing mainWorld with projects:', error);
    }
  };
  
  // --- After successful save in handleSaveProject (at the end of the try block) ---
  
  // --- ADD THIS RIGHT BEFORE the "// Signal success to the user" line ---

  // Hook into saveProject function to add direct sync button for debugging
  const saveDebugData = (projectId: number) => {
    if (!selectedProject) {
      showDebugInfo('Error', 'No project selected', null, 'error');
      return;
    }
    
    showDebugInfo(
      'Saving Project with Direct Access', 
      'Starting direct save process for more reliable data persistence',
      { projectId, formData: projectFormData },
      'info',
      [
        {
          label: 'Save Project',
          action: () => {
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
            handleSaveProject(fakeEvent);
          },
          type: 'primary'
        },
        {
          label: 'Force Sync Main World',
          action: syncMainWorldWithProjects,
          type: 'warning'
        }
      ]
    );
  };
  
  // Delete project
  const handleDeleteProject = async (id: number) => {
    try {
      setIsLoading(true);
      
      // Delete the project
      await projectService.deleteProject(id);
      
      // Update the projects list
      const updatedProjects = projects.filter(p => p.id !== id);
      setProjects(updatedProjects);
      
      // Show success message
      setSuccessMessage('Project deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh worlds
      refreshWorlds();
    } catch (error) {
      console.error('Error deleting project:', error);
      setErrorMessage(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);
  
  // Function to inspect localStorage contents
  const inspectLocalStorage = () => {
    try {
      const worldData = localStorage.getItem('portfolio_worlds');
      
      if (!worldData) {
        showDebugInfo(
          'LocalStorage Empty',
          'No world data found in localStorage',
          null,
          'warning'
        );
        return;
      }
      
      const parsedData = JSON.parse(worldData);
      
      showDebugInfo(
        'LocalStorage Contents',
        `Found ${parsedData.length} worlds in localStorage`,
        parsedData,
        'info'
      );
    } catch (error) {
      showDebugInfo(
        'LocalStorage Error',
        'Error reading localStorage',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'error'
      );
    }
  };
  
  // Function to directly edit raw environment properties
  const editRawEnvironment = (projectId: number) => {
    try {
      const worldId = getWorldId(projectId);
      
      // Get the service
      const service = getOrCreateWorldService();
      if (!service) {
        setErrorMessage('WorldService not available and could not be created');
        return;
      }
      
      // Get world from service first
      let world: World | null = service.getWorld(worldId);
      
      if (!world) {
        // If not in service, check localStorage
        const worldsStr = localStorage.getItem(STORAGE_KEY);
        if (!worldsStr) {
          setErrorMessage('No worlds data found in localStorage');
          return;
        }
        
        try {
          const worldsData = JSON.parse(worldsStr) as World[];
          const foundWorld = worldsData.find(w => w.id === worldId);
          if (foundWorld) {
            world = foundWorld;
          }
        } catch (e) {
          setErrorMessage('Failed to parse worlds data');
          return;
        }
      }
      
      if (!world) {
        setErrorMessage(`World with ID ${worldId} not found`);
        return;
      }
      
      // Create a textarea with JSON for editing
      const jsonString = JSON.stringify(world, null, 2);
      const rawJson = prompt('Edit the raw world data (BE CAREFUL!):', jsonString);
      
      if (rawJson === null) return; // User cancelled
      
      try {
        // Parse and validate the edited JSON
        const editedWorld = JSON.parse(rawJson);
        
        if (!editedWorld.id || editedWorld.id !== worldId) {
          throw new Error('World ID must not be changed');
        }
        
        // Save to service
        service.updateWorld(editedWorld);
        service.saveAllWorlds();
        
        // Force reload worlds
        service.clearAllWorlds();
        service.reloadWorlds();
        
        // Inform the user and reload
        setSuccessMessage('World data updated directly. Reloading...');
        setTimeout(() => {
          initializeData();
        }, 1000);
      } catch (e) {
        console.error('Error updating world from raw JSON:', e);
        setErrorMessage(`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in raw editor:', error);
      setErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Function to copy debug data to clipboard
  const copyToClipboard = (data: any) => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(jsonString);
      setSuccessMessage('Debug data copied to clipboard!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setErrorMessage('Failed to copy to clipboard');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };
  
  // Function to export all localStorage data
  const exportLocalStorage = () => {
    try {
      const allData: Record<string, any> = {};
      
      // Collect all localStorage items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            allData[key] = JSON.parse(localStorage.getItem(key) || '""');
          } catch (e) {
            allData[key] = localStorage.getItem(key);
          }
        }
      }
      
      // Create a downloadable file
      const jsonString = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'portfolio_localStorage_export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccessMessage('localStorage data exported successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error exporting localStorage:', error);
      setErrorMessage('Failed to export localStorage data');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };
  
  // Function to inspect world data
  const inspectWorld = (projectId: number) => {
    try {
      // Get the world ID for this project
      const worldId = getWorldId(projectId);
      console.log(`Inspecting world with ID: ${worldId}`);
      
      // Get the world from the service
      const worldService = getWorldServiceInstance();
      const world = worldService.getWorld(worldId);
      
      if (!world) {
        showDebugInfo(
          'World Not Found', 
          `No world found for project with ID ${projectId}. World ID: ${worldId}`,
          null,
          'warning',
          [
            {
              label: 'Create World',
              action: () => {
                // Create a new world for this project
                const project = projects.find(p => p.id === projectId);
                if (project) {
                  const newWorld = {
                    id: worldId,
                    name: project.name,
                    description: project.description,
                    backgroundColor: '#000000',
                    floorColor: '#222222',
                    skyColor: '#111111',
                    ambientLightColor: '#ffffff',
                    ambientLightIntensity: 0.5,
                    directionalLightColor: '#ffffff',
                    directionalLightIntensity: 0.8,
                    objects: [
                      {
                        id: `back-button-${projectId}`,
                        type: 'button' as const,
                        title: 'Back to Hub',
                        position: [-8, 2, 0] as [number, number, number],
                        action: 'navigate' as const,
                        destination: 'hub'
                      },
                      {
                        id: `project-card-${projectId}`,
                        type: 'project' as const,
                        title: project.name,
                        description: project.description,
                        thumbnail: project.thumbnail,
                        projectId: project.id,
                        position: [0, 4, 0] as [number, number, number]
                      }
                    ]
                  };
                  
                  worldService.updateWorld(newWorld);
                  refreshWorlds();
                  showDebugInfo('World Created', `Created new world for project ${project.name}`, newWorld, 'success');
                } else {
                  showDebugInfo('Project Not Found', `Project with ID ${projectId} not found`, null, 'error');
                }
              },
              type: 'primary'
            }
          ]
        );
        return;
      }
      
      // Show the world details in the debug dialog
      showDebugInfo(
        `World: ${world.name}`, 
        `Inspecting world for project with ID ${projectId}`,
        world,
        'info',
        [
          {
            label: 'Edit World',
            action: () => {
              // Find the project associated with this world
              const project = projects.find(p => getWorldId(p.id) === world.id);
              if (project) {
                handleEditProject(project);
              } else {
                showDebugInfo('Project Not Found', `Could not find project for world ${world.id}`, null, 'error');
              }
            },
            type: 'primary'
          },
          {
            label: 'Reset World',
            action: () => {
              if (window.confirm('Are you sure you want to reset this world? This will remove all media items.')) {
                // Find the project
                const project = projects.find(p => getWorldId(p.id) === world.id);
                if (project) {
                  // Create a new world with basic objects only
                  const resetWorld = {
                    ...world,
                    objects: [
                      {
                        id: `back-button-${projectId}`,
                        type: 'button' as const,
                        title: 'Back to Hub',
                        position: [-8, 2, 0] as [number, number, number],
                        action: 'navigate' as const,
                        destination: 'hub'
                      },
                      {
                        id: `project-card-${projectId}`,
                        type: 'project' as const,
                        title: project.name,
                        description: project.description,
                        thumbnail: project.thumbnail,
                        projectId: project.id,
                        position: [0, 4, 0] as [number, number, number]
                      }
                    ]
                  };
                  
                  worldService.updateWorld(resetWorld);
                  refreshWorlds();
                  showDebugInfo('World Reset', `Reset world for project ${project.name}`, resetWorld, 'success');
                }
              }
            },
            type: 'warning'
          }
        ]
      );
    } catch (error) {
      console.error('Error inspecting world:', error);
      showDebugInfo('Error', `Failed to inspect world: ${error instanceof Error ? error.message : 'Unknown error'}`, error, 'error');
    }
  };
  
  // Function to force update a world
  const forceUpdateWorld = (projectId: number) => {
    // This now calls our save function directly
    saveDebugData(projectId);
  };
  
  // Function to reset all data
  const resetAllData = () => {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Reset state
      setProjects([]);
      setWorlds([]);
      setSelectedProject(null);
      setIsEditingProject(false);
      setProjectMedia([]);
      
      // Show success message
      setSuccessMessage('All data has been reset');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Reinitialize data
      initializeData();
    } catch (error) {
      console.error('Error resetting data:', error);
      setErrorMessage(`Failed to reset data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Add a special function to fix colors directly in localStorage
  const fixWorldColors = (projectId: number) => {
    try {
      // Define possible world ID formats
      const possibleWorldIds = [
        `project-world-${projectId}`,  // Primary format we want to use
        `world_${projectId}`           // Alternative format 
      ];
      
      // Show what we're about to do
      showDebugInfo('Color Fix Started', 'Attempting to fix world colors directly in localStorage', { 
        projectId, 
        possibleWorldIds,
        worldSettings: projectFormData.worldSettings 
      }, 'info');
      
      // Get storage data
      const worldsStr = localStorage.getItem(STORAGE_KEY);
      
      if (!worldsStr) {
        showDebugInfo('Fix Failed', 'No worlds data found in localStorage', null, 'error');
        return;
      }
      
      // Parse worlds data
      try {
        let worlds = JSON.parse(worldsStr);
        let foundWorldId = null;
        
        // Find the world ID that exists in the data
        for (const worldId of possibleWorldIds) {
          const index = worlds.findIndex((w: any) => w.id === worldId);
          if (index >= 0) {
            foundWorldId = worldId;
            break;
          }
        }
        
        if (!foundWorldId) {
          showDebugInfo('Fix Failed', 'No matching world found for this project', 
            { projectId, checkedIds: possibleWorldIds }, 
            'error'
          );
          return;
        }
        
        // Find the specific world
        const index = worlds.findIndex((w: any) => w.id === foundWorldId);
        
        // Store old values for debug
        const oldValues = {
          id: worlds[index].id,
          backgroundColor: worlds[index].backgroundColor,
          floorColor: worlds[index].floorColor,
          skyColor: worlds[index].skyColor
        };
        
        // Apply new colors directly
        worlds[index].backgroundColor = projectFormData.worldSettings.backgroundColor;
        worlds[index].floorColor = projectFormData.worldSettings.floorColor;
        worlds[index].skyColor = projectFormData.worldSettings.skyColor;
        
        // Update projectName and description if empty
        if (!worlds[index].name || worlds[index].name.trim() === '') {
          worlds[index].name = projectFormData.name;
        }
        
        if (!worlds[index].description || worlds[index].description.trim() === '') {
          worlds[index].description = projectFormData.description;
        }
        
        // Save back to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(worlds));
        
        // Try to update the service too
        const service = getWorldServiceInstance();
        if (service) {
          service.clearAllWorlds();
          service.reloadWorlds();
          
          // Refresh worlds using the context function
          refreshWorlds();
          
          // Verify fix
          const reloadedWorld = service.getWorld(foundWorldId);
          if (reloadedWorld) {
            showDebugInfo('Fix Applied', 'World colors updated directly in localStorage', {
              id: reloadedWorld.id,
              before: oldValues,
              after: {
                backgroundColor: reloadedWorld.backgroundColor,
                floorColor: reloadedWorld.floorColor,
                skyColor: reloadedWorld.skyColor
              }
            }, 'success');
          } else {
            showDebugInfo('Fix Verification Failed', 'World not found after updating colors', null, 'warning');
          }
        }
      } catch (e) {
        showDebugInfo('Fix Failed', 'Error parsing or updating world data', e, 'error');
      }
    } catch (error) {
      showDebugInfo('Fix Error', 'Unexpected error fixing world colors', error, 'error');
    }
  };
  
  // Enhanced cleanup function for duplicate worlds
  const cleanupDuplicateWorlds = () => {
    try {
      // Get all worlds
      const service = getWorldServiceInstance();
      const allWorlds = service.getAllWorlds();
      
      // Find duplicate worlds (same project ID)
      const worldsByProjectId = new Map<string, World[]>();
      
      allWorlds.forEach(world => {
        const projectId = world.id.replace('project-world-', '');
        if (!worldsByProjectId.has(projectId)) {
          worldsByProjectId.set(projectId, []);
        }
        worldsByProjectId.get(projectId)?.push(world);
      });
      
      // Keep only the most recent world for each project
      let duplicatesRemoved = 0;
      
      worldsByProjectId.forEach((worlds, projectId) => {
        if (worlds.length > 1) {
          // Sort by creation date (assuming newer worlds have higher IDs)
          worlds.sort((a, b) => b.id.localeCompare(a.id));
          
          // Keep the first one, remove the rest
          for (let i = 1; i < worlds.length; i++) {
            service.removeWorld(worlds[i].id);
            duplicatesRemoved++;
          }
        }
      });
      
      // Update worlds list
      setWorlds(service.getAllWorlds());
      
      // Show success message
      setSuccessMessage(`Cleanup complete: Removed ${duplicatesRemoved} duplicate worlds`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh worlds
      refreshWorlds();
      
      // Reinitialize data
      initializeData();
    } catch (error) {
      console.error('Error cleaning up duplicate worlds:', error);
      setErrorMessage(`Failed to clean up duplicate worlds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Check if a project has a saved world
  const projectHasSavedWorld = (project: Project): boolean => {
    if (!project || !project.id) return false;
    
    // Get the world ID for this project
    const worldId = getWorldId(project.id);
    
    // Check if this world exists in the worlds list
    return worlds.some(world => world.id === worldId);
  };

  // Fix handleEditProject function to properly load project data and media
  const handleEditProject = (project: Project) => {
    console.log('Editing project:', project);
    
    // Set the selected project
    setSelectedProject(project);
    setIsEditingProject(true);
    
    // Create a complete form data object with all required fields
    const formData = {
      name: project.name,
      description: project.description,
      link: project.link,
      thumbnail: project.thumbnail || '',
      status: project.status || 'completed',
      type: project.type || 'standard',
      videoUrl: project.videoUrl || '',
      customLink: project.customLink || '',
      worldSettings: project.worldSettings || {
        backgroundColor: '#000000',
        floorColor: '#222222',
        skyColor: '#111111',
        floorTexture: '', // Initialize floorTexture
        skyTexture: '',   // Initialize skyTexture
        ambientLightColor: '#ffffff',
        ambientLightIntensity: 0.5,
        directionalLightColor: '#ffffff',
        directionalLightIntensity: 0.8
      }
    };
    
    // Update both state variables to ensure they're in sync
    setProjectFormData(formData);
    setProjectForm(formData);
    
    // Load project media
    const worldId = getWorldId(project.id);
    const worldService = getWorldServiceInstance();
    
    // Force clear the world service cache to ensure fresh data
    worldService.clearAllWorlds();
    
    const world = worldService.getWorld(worldId);
    
    if (world && world.objects) {
      // Look for media objects with IDs that include the project ID
      const mediaObjects = world.objects.filter((obj: any) => 
        obj.id && 
        (obj.id.includes(`media-${project.id}`) || obj.id.includes(`media_${project.id}`)) && 
        ['image', 'video', 'pdf'].includes(obj.type)
      );
      
      console.log('Found media objects:', mediaObjects);
      
      // Convert world media objects to MediaFormData format
      const mediaItems: MediaFormData[] = mediaObjects.map((obj: any) => {
        // Make sure all required fields are present
        const mediaItem: MediaFormData = {
          title: obj.title || '',
          description: obj.description || '',
          type: (obj.type as 'image' | 'video' | 'pdf') || 'image',
          url: obj.url || '',
          position: Array.isArray(obj.position) && obj.position.length === 3 ? 
            obj.position as [number, number, number] : 
            [0, 2, 0] as [number, number, number]
        };
        
        // Ensure URL is valid by running it through validateAndNormalizeUrl
        if (mediaItem.url) {
          mediaItem.url = validateAndNormalizeUrl(mediaItem.url, mediaItem.type);
        }
        
        return mediaItem;
      });
      
      if (mediaItems.length > 0) {
        console.log('Setting project media:', mediaItems);
        setProjectMedia(mediaItems);
      } else {
        console.log('No valid media found for project:', project.id);
        setProjectMedia([]);
      }
    } else {
      // No world or media found, reset project media
      setProjectMedia([]);
      console.log('No world or media found for project:', project.id);
    }
    
    // Switch to the project edit tab
    setActiveSubTab('project');
  };

  // Update the project card's edit button to use handleEditProject
  const renderProjectCard = (project: Project) => {
    const hasSavedWorld = projectHasSavedWorld(project);
    
    // Function to get reliable thumbnail URL
    const getThumbnailUrl = (project: Project) => {
      // 1. If there's no thumbnail, create a colored SVG
      if (!project.thumbnail) {
        const hue = (project.id * 37) % 360;
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='hsl(${hue}, 80%25, 80%25)' /%3E%3Ctext x='160' y='90' font-family='Arial' font-size='16' text-anchor='middle' alignment-baseline='middle' fill='%23333'%3E${encodeURIComponent(project.name)}%3C/text%3E%3C/svg%3E`;
      }
      
      // 2. For data URLs (SVG or base64), return as is - these are already reliable
      if (project.thumbnail.startsWith('data:')) {
        return project.thumbnail;
      }
      
      // 3. For YouTube videos, ensure we use the right thumbnail format
      if (project.thumbnail.includes('youtube.com') || project.thumbnail.includes('youtu.be')) {
        try {
          const videoId = project.thumbnail.match(/(?:v=|youtu\.be\/|embed\/)([^&?\/]+)/)?.[1];
          if (videoId) {
            return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
          }
        } catch (error) {
          console.error("Failed to parse YouTube URL", error);
        }
      }
      
      // 4. For via.placeholder.com, return as is (reliable)
      if (project.thumbnail.includes('via.placeholder.com')) {
        return project.thumbnail;
      }
      
      // 5. For all other cases, generate a reliable SVG
      const hue = (project.id * 37) % 360;
      return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='hsl(${hue}, 80%25, 80%25)' /%3E%3Ctext x='160' y='90' font-family='Arial' font-size='16' text-anchor='middle' alignment-baseline='middle' fill='%23333'%3E${encodeURIComponent(project.name)}%3C/text%3E%3C/svg%3E`;
    };
    
    return (
      <div 
        key={project.id} 
        className={`project-card ${selectedProject?.id === project.id ? 'selected' : ''}`}
        onClick={() => {
          setSelectedProject(project);
          setIsEditingProject(true);
          setActiveSubTab('list');
        }}
      >
        <div className="project-thumbnail">
          <img 
            src={getThumbnailUrl(project)} 
            alt={project.name} 
            onError={(e) => {
              // If image fails to load, replace with fallback
              const img = e.target as HTMLImageElement;
              const hue = (project.id * 37) % 360;
              img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='hsl(${hue}, 80%25, 80%25)' /%3E%3Ctext x='160' y='90' font-family='Arial' font-size='16' text-anchor='middle' alignment-baseline='middle' fill='%23333'%3E${encodeURIComponent(project.name)}%3C/text%3E%3C/svg%3E`;
            }}
          />
        </div>
        <div className="project-badges">
          <span className={`status-badge ${project.status}`}>{project.status}</span>
          <span className={`type-badge ${project.type}`}>{project.type}</span>
          <span className={`world-badge ${hasSavedWorld ? 'saved' : 'missing'}`}>
            {hasSavedWorld ? '🌎 World' : '⚠️ No World'}
          </span>
          {project.customLink && (
            <span className="custom-link-badge">🔗 Custom Link</span>
          )}
        </div>
        <div className="project-info">
          <h3>{project.name}</h3>
          <p>{project.description}</p>
          {project.customLink && (
            <div className="custom-link-info">
              <small>Custom URL: <a href={`/project/${project.customLink}`} target="_blank" onClick={(e) => e.stopPropagation()}>/project/{project.customLink}</a></small>
            </div>
          )}
        </div>
        <div className="project-actions">
          <button 
            className="edit-button"
            onClick={(e) => {
              e.stopPropagation(); 
              handleEditProject(project);
            }}
          >
            Edit
          </button>
          <button 
            className="delete-button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteProject(project.id!);
            }}
          >
            Delete
          </button>
          <ViewWorldButton 
            projectId={project.id!}
            className="view-button"
          />
        </div>
      </div>
    );
  };
  
  const renderDebugDialog = () => {
    if (!debugInfo.isVisible) return null;

    const statusClass = `status-${debugInfo.type}`;
    const statusText = debugInfo.type.charAt(0).toUpperCase() + debugInfo.type.slice(1);

    return (
      <div className="debug-dialog">
        <h2>
          {debugInfo.title}
          <span className={`status-badge ${statusClass}`}>{statusText}</span>
        </h2>
        <p>{debugInfo.message}</p>
        
        {debugInfo.data && (
          <div className="debug-data-container">
            <div className="debug-data-header">
              <h4>Debug Data</h4>
              <button 
                className="copy-button"
                onClick={() => copyToClipboard(JSON.stringify(debugInfo.data, null, 2))}
              >
                Copy Data
              </button>
            </div>
            <pre className="debug-data">
              {JSON.stringify(debugInfo.data, null, 2)}
            </pre>
          </div>
        )}
        
        {debugInfo.customActions && debugInfo.customActions.length > 0 && (
          <div className="debug-custom-actions">
            {debugInfo.customActions.map((action, index) => (
              <button 
                key={index} 
                className={action.type}
                onClick={action.action}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        
        <div className="debug-actions">
          <button onClick={() => setDebugInfo({...debugInfo, isVisible: false})}>
            Close
          </button>
        </div>
      </div>
    );
  };
  
  // Add useEffect to ensure cursor is visible in admin panel
  useEffect(() => {
    // Store the original cursor style
    const originalBodyCursor = document.body.style.cursor;
    
    // Set cursor to default for the admin panel
    document.body.style.cursor = 'default';
    
    // Add a class to the body to enable all cursor styles
    document.body.classList.add('admin-mode');
    
    // Force cursor visibility with inline styles on common elements
    const adminContainer = document.querySelector('.admin-dashboard');
    if (adminContainer) {
      const elements = adminContainer.querySelectorAll('button, a, input, select, .view-world-btn, .edit-button, .delete-button');
      elements.forEach(el => {
        if (el instanceof HTMLElement) {
          if (el.tagName.toLowerCase() === 'button' || 
              el.classList.contains('view-world-btn') || 
              el.classList.contains('edit-button') || 
              el.classList.contains('delete-button')) {
            el.style.cursor = 'pointer';
          } else {
            el.style.cursor = 'auto';
          }
        }
      });
    }
    
    // Clean up when component unmounts
    return () => {
      // document.body.style.cursor = originalBodyCursor; // Previous problematic line
      document.body.style.cursor = 'none'; // Explicitly set to what the 3D app likely expects
      document.body.classList.remove('admin-mode');
    };
  }, []);
  
  // Improved function to reset the media form
  const resetMediaForm = () => {
    console.log('Resetting media form');
    
    const defaultMediaForm = {
      title: '',
      description: '',
      type: 'image' as const,
      url: '',
      position: [0, 2, 0] as [number, number, number]
    };
    
    // Create new objects to avoid reference issues
    setMediaFormData({...defaultMediaForm});
    setMediaForm({...defaultMediaForm});
    
    // Reset editing state
    setEditingMediaIndex(null);
    
    // Reset file upload state
    setFileUploadPreview(null);
    setSelectedFile(null);
    
    // Reset the file input field if it exists
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Improved function to handle editing media
  const handleEditMedia = (index: number) => {
    if (index < 0 || index >= projectMedia.length) {
      console.error(`Invalid media index for editing: ${index}`);
      return;
    }
    
    const media = projectMedia[index];
    
    console.log(`Editing media at index ${index}:`, media);
    
    // Ensure position is properly formatted
    const position: [number, number, number] = Array.isArray(media.position) && media.position.length === 3 
      ? [media.position[0], media.position[1], media.position[2]] 
      : [0, 2, 0];
    
    // Create a complete media form data object with proper typing
    const mediaData: MediaFormData = {
      title: media.title || '',
      description: media.description || '',
      type: media.type || 'image',
      url: media.url || '',
      position: position
    };
    
    // Update both state variables to ensure they're in sync
    setMediaFormData({...mediaData});
    setMediaForm({...mediaData});
    
    // Set the editing index
    setEditingMediaIndex(index);
    
    // Reset file upload state since we're editing an existing item
    setFileUploadPreview(null);
    setSelectedFile(null);
    
    // Reset the file input field if it exists
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Scroll to the media form
    setTimeout(() => {
      const mediaFormElement = document.querySelector('#media-edit-form-container');
      if (mediaFormElement) {
        mediaFormElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        console.warn('Media form element (#media-edit-form-container) not found for scrolling.');
      }
    }, 100);
    
    // Switch to the media tab if not already there
    if (activeSubTab !== 'media') {
      setActiveSubTab('media');
    }
  };
  
  // Update the logErrorsToConsole function to be more comprehensive
  const logErrorsToConsole = () => {
    console.group('%c 3D Portfolio Admin - Debug Information', 'color: #3b82f6; font-size: 16px; font-weight: bold;');
    
    console.group('%c State Information', 'color: #10b981; font-weight: bold;');
    console.log('Active Tab:', activeTab);
    console.log('Active SubTab:', activeSubTab);
    console.log('Projects:', projects);
    console.log('Worlds:', worlds);
    console.log('Selected Project:', selectedProject);
    console.log('Is Editing Project:', isEditingProject);
    console.log('Project Media:', projectMedia);
    console.groupEnd();
    
    console.group('%c Error Information', 'color: #ef4444; font-weight: bold;');
    console.log('Error Message:', errorMessage);
    console.log('Init Error:', initError);
    console.log('Debug Info:', debugInfo);
    console.groupEnd();
    
    console.group('%c Local Storage', 'color: #f59e0b; font-weight: bold;');
    try {
      const portfolioProjects = localStorage.getItem('portfolio_projects');
      const portfolioWorlds = localStorage.getItem('portfolio_worlds');
      
      console.log('Projects Storage:', portfolioProjects ? JSON.parse(portfolioProjects) : null);
      console.log('Worlds Storage:', portfolioWorlds ? JSON.parse(portfolioWorlds) : null);
      console.log('Total Storage Size:', 
        (portfolioProjects?.length || 0) + 
        (portfolioWorlds?.length || 0) + 
        ' characters'
      );
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
    console.groupEnd();
    
    console.group('%c Environment Info', 'color: #8b5cf6; font-weight: bold;');
    console.log('User Agent:', navigator.userAgent);
    console.log('Window Size:', `${window.innerWidth}x${window.innerHeight}`);
    console.log('Base URL:', window.location.origin);
    console.groupEnd();
    
    console.groupEnd();
    
    // Show a message to the user about checking the console
    showDebugInfo('Debug Information', 
      'Detailed debug information has been logged to the browser console. Please open the developer tools to view it.',
      null,
      'info',
      [
        {
          label: 'Copy Debug Data',
          action: () => {
            const debugData = {
              projects,
              worlds,
              selectedProject,
              isEditingProject,
              projectMedia,
              errors: {
                errorMessage,
                initError: initError?.message,
              },
              localStorage: {
                portfolioProjects: localStorage.getItem('portfolio_projects'),
                portfolioWorlds: localStorage.getItem('portfolio_worlds'),
              },
              environment: {
                userAgent: navigator.userAgent,
                windowSize: `${window.innerWidth}x${window.innerHeight}`,
                baseUrl: window.location.origin,
              },
              timestamp: new Date().toISOString(),
            };
            
            copyToClipboard(debugData);
            setSuccessMessage('Debug data copied to clipboard');
            setTimeout(() => setSuccessMessage(''), 3000);
          },
          type: 'primary'
        },
        {
          label: 'Retry Loading',
          action: () => {
            setIsLoading(true);
            initializeData();
          },
          type: 'warning'
        }
      ]
    );
  };
  
  // LoadingTimer component to show how long the app has been loading
  const LoadingTimer = () => {
    const [seconds, setSeconds] = useState(0);
    
    useEffect(() => {
      const interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(interval);
    }, []);
    
    return (
      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: seconds > 10 ? 'var(--admin-danger)' : 'inherit' }}>
        Loading for {seconds} seconds
        {seconds > 10 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--admin-warning)' }}>
            Loading is taking longer than expected
          </div>
        )}
      </div>
    );
  };
  
  // Add a function to force refresh the world service
  const forceRefreshWorldService = () => {
    console.log('Force refreshing world service...');
    const worldService = getWorldServiceInstance();
    worldService.clearAllWorlds();
    worldService.reloadWorlds();
    refreshWorlds();
    console.log('World service refreshed');
  };
  
  // Main render method
  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <h1 className="admin-title">
          <i className="fas fa-cube"></i> 3D Portfolio Admin
        </h1>
        
        <nav className="admin-nav">
          <button 
            className={`admin-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('projects');
              setActiveSubTab('list');
              // Clear editing state when switching to projects list
              if (isEditingProject) {
                setIsEditingProject(false);
                setSelectedProject(null);
              }
            }}
          >
            <i className="fas fa-project-diagram"></i> Projects & Worlds
          </button>
          <button 
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <i className="fas fa-cog"></i> Settings
          </button>
          <button 
            className={`admin-nav-item ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            <i className="fas fa-bug"></i> Debug Tools
          </button>
          <button 
            className="admin-nav-item"
            onClick={() => {
              setIsLoading(true);
              initializeData();
            }}
            title="Reload Data"
          >
            <i className="fas fa-sync-alt"></i> Reload
          </button>
          <button 
            className="admin-nav-item"
            onClick={forceRefreshWorldService}
            title="Force Refresh World Service"
          >
            <i className="fas fa-sync"></i> Force Refresh
          </button>
        </nav>
        
        <button className="admin-logout" onClick={onLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </header>
      
      {/* Main Content */}
      <main className="admin-content">
        {/* Project Tabs */}
        {activeTab === 'projects' && (
          <div className="admin-tabs">
            <button 
              className={`admin-tab ${activeSubTab === 'list' ? 'active' : ''}`}
              onClick={() => {
                setActiveSubTab('list');
                // Clear editing state when going to list view
                if (isEditingProject) {
                  setIsEditingProject(false);
                  setSelectedProject(null);
                }
              }}
            >
              <i className="fas fa-th-large"></i> All Projects
            </button>
            <button 
              className={`admin-tab ${activeSubTab === 'project' && !isEditingProject ? 'active' : ''}`}
              onClick={() => {
                // If currently editing, stay in editing mode
                if (!isEditingProject) {
                  setActiveSubTab('list');
                  resetProjectForm();
                }
              }}
            >
              <i className="fas fa-plus"></i> New Project
            </button>
            {isEditingProject && selectedProject && (
              <button 
                className={`admin-tab ${activeSubTab === 'project' && isEditingProject ? 'active' : ''}`}
                onClick={() => setActiveSubTab('project')}
              >
                <i className="fas fa-edit"></i> Edit: <strong>{selectedProject.name || 'Project'}</strong>
              </button>
            )}
            {selectedProject && (
              <button 
                className={`admin-tab ${activeSubTab === 'media' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('media')}
              >
                <i className="fas fa-photo-video"></i> Media Content
              </button>
            )}
            <button 
              className={`admin-tab ${activeSubTab === 'mainscene' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('mainscene')}
            >
              <i className="fas fa-globe"></i> Main Scene Settings
            </button>
          </div>
        )}
        
        {/* Loading Overlay with Debug Button */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading...</p>
            
            {/* Add a counter to show how long it's been loading */}
            <LoadingTimer />
            
            {/* Debug button */}
            <button 
              className="admin-button danger"
              style={{ marginTop: '1rem' }}
              onClick={logErrorsToConsole}
            >
              <i className="fas fa-bug"></i> Debug Loading Issue
            </button>
          </div>
        )}
        
        {/* Success/Error Messages */}
        {successMessage && !isEditingProject && activeSubTab !== 'project' && (
          <div className="status-message success">
            <i className="fas fa-check-circle"></i>
            <span>{successMessage}</span>
          </div>
        )}
        
        {errorMessage && !isEditingProject && activeSubTab !== 'project' && (
          <div className="status-message error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{errorMessage}</span>
          </div>
        )}
        
        {/* Content based on active tab */}
        {activeTab === 'projects' && activeSubTab === 'mainscene' && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">Main Scene Settings</h2>
                <p className="admin-card-subtitle">
                  Customize the appearance of the main 3D environment
                </p>
              </div>
            </div>
            
            <div className="admin-card-body">
              {/* Success/Error Messages */}
              {successMessage && (
                <div className="status-message success">
                  <i className="fas fa-check-circle"></i>
                  <span>{successMessage}</span>
                </div>
              )}
              
              {errorMessage && (
                <div className="status-message error">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{errorMessage}</span>
                </div>
              )}
              
              <div className="settings-form">
                <div className="form-group">
                  <label>Background Color</label>
                  <div className="color-input-group">
                    <input 
                      type="color" 
                      name="backgroundColor"
                      value={mainSceneSettings.backgroundColor} 
                      onChange={handleMainSceneSettingsChange}
                    />
                    <input 
                      type="text" 
                      name="backgroundColor"
                      value={mainSceneSettings.backgroundColor} 
                      onChange={handleMainSceneSettingsChange}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Floor Color</label>
                  <div className="color-input-group">
                    <input 
                      type="color" 
                      name="floorColor"
                      value={mainSceneSettings.floorColor} 
                      onChange={handleMainSceneSettingsChange}
                    />
                    <input 
                      type="text" 
                      name="floorColor"
                      value={mainSceneSettings.floorColor} 
                      onChange={handleMainSceneSettingsChange}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Sky Color</label>
                  <div className="color-input-group">
                    <input 
                      type="color" 
                      name="skyColor"
                      value={mainSceneSettings.skyColor} 
                      onChange={handleMainSceneSettingsChange}
                    />
                    <input 
                      type="text" 
                      name="skyColor"
                      value={mainSceneSettings.skyColor} 
                      onChange={handleMainSceneSettingsChange}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Ambient Light Color</label>
                  <div className="color-input-group">
                    <input 
                      type="color" 
                      name="ambientLightColor"
                      value={mainSceneSettings.ambientLightColor} 
                      onChange={handleMainSceneSettingsChange}
                    />
                    <input 
                      type="text" 
                      name="ambientLightColor"
                      value={mainSceneSettings.ambientLightColor} 
                      onChange={handleMainSceneSettingsChange}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Ambient Light Intensity</label>
                  <input 
                    type="range" 
                    name="ambientLightIntensity"
                    min="0" 
                    max="2" 
                    step="0.1"
                    value={mainSceneSettings.ambientLightIntensity} 
                    onChange={handleMainSceneSettingsChange}
                  />
                  <span className="range-value">{mainSceneSettings.ambientLightIntensity}</span>
                </div>
                
                <div className="form-group">
                  <label>Directional Light Color</label>
                  <div className="color-input-group">
                    <input 
                      type="color" 
                      name="directionalLightColor"
                      value={mainSceneSettings.directionalLightColor} 
                      onChange={handleMainSceneSettingsChange}
                    />
                    <input 
                      type="text" 
                      name="directionalLightColor"
                      value={mainSceneSettings.directionalLightColor} 
                      onChange={handleMainSceneSettingsChange}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Directional Light Intensity</label>
                  <input 
                    type="range" 
                    name="directionalLightIntensity"
                    min="0" 
                    max="2" 
                    step="0.1"
                    value={mainSceneSettings.directionalLightIntensity} 
                    onChange={handleMainSceneSettingsChange}
                  />
                  <span className="range-value">{mainSceneSettings.directionalLightIntensity}</span>
                </div>
                
                <div className="form-actions">
                  <button 
                    className="admin-button secondary"
                    onClick={loadMainSceneSettings}
                  >
                    <i className="fas fa-undo"></i> Reset
                  </button>
                  <button 
                    className="admin-button primary"
                    onClick={saveMainSceneSettings}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="button-spinner"></div> Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i> Save Settings
                      </>
                    )}
                  </button>
                </div>
                
                <div className="preview-section">
                  <h3>Color Preview</h3>
                  <div className="color-preview-grid">
                    <div 
                      className="color-preview-item" 
                      style={{backgroundColor: mainSceneSettings.backgroundColor}}
                      title="Background Color"
                    >
                      <span>Background</span>
                    </div>
                    <div 
                      className="color-preview-item" 
                      style={{backgroundColor: mainSceneSettings.floorColor}}
                      title="Floor Color"
                    >
                      <span>Floor</span>
                    </div>
                    <div 
                      className="color-preview-item" 
                      style={{backgroundColor: mainSceneSettings.skyColor}}
                      title="Sky Color"
                    >
                      <span>Sky</span>
                    </div>
                    <div 
                      className="color-preview-item" 
                      style={{
                        backgroundColor: mainSceneSettings.ambientLightColor,
                        opacity: mainSceneSettings.ambientLightIntensity / 2
                      }}
                      title="Ambient Light"
                    >
                      <span>Ambient Light</span>
                    </div>
                    <div 
                      className="color-preview-item" 
                      style={{
                        backgroundColor: mainSceneSettings.directionalLightColor,
                        opacity: mainSceneSettings.directionalLightIntensity / 2
                      }}
                      title="Directional Light"
                    >
                      <span>Directional Light</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'projects' && activeSubTab === 'list' && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">Projects & Worlds</h2>
                <p className="admin-card-subtitle">
                  Manage your portfolio projects and 3D worlds
                </p>
              </div>
              <button 
                className="admin-button primary"
                onClick={() => {
                  resetProjectForm();
                  setIsEditingProject(false);
                  setActiveSubTab('project');
                }}
              >
                <i className="fas fa-plus"></i> New Project
              </button>
            </div>
            
            {isLoading ? (
              <div className="loading-state" style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '2rem' }}>
                <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: 'var(--admin-light-gray)', marginBottom: '1rem' }}></i>
                <h3>No Projects Yet</h3>
                <p>Create your first project to get started</p>
                <button 
                  className="admin-button primary"
                  onClick={() => {
                    resetProjectForm();
                    setIsEditingProject(false);
                    setActiveSubTab('project');
                  }}
                  style={{ marginTop: '1rem' }}
                >
                  <i className="fas fa-plus"></i> Create Project
                </button>
              </div>
            ) : (
              <div className="project-grid">
                {projects.map(project => renderProjectCard(project))}
              </div>
            )}
          </div>
        )}
        
        {/* Project Creation/Editing Form */}
        {activeTab === 'projects' && activeSubTab === 'project' && (
          <div className="admin-card project-form-container">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">
                  {isEditingProject ? 'Edit Project' : 'Create New Project'}
                </h2>
                <p className="admin-card-subtitle">
                  {isEditingProject 
                    ? `Editing details for: ${selectedProject?.name || 'Selected Project'}` 
                    : 'Define the properties of your new project'}
                </p>
              </div>
              <button 
                className="admin-button"
                onClick={() => {
                  setIsEditingProject(false);
                  setSelectedProject(null);
                  setActiveSubTab('list'); // Go back to list
                }}
              >
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
            
            {/* Specific messages for the form view */}
            {successMessage && (isEditingProject || activeSubTab === 'project') && (
              <div className="status-message success">
                <i className="fas fa-check-circle"></i>
                <span>{successMessage}</span>
              </div>
            )}
            
            {errorMessage && (isEditingProject || activeSubTab === 'project') && (
              <div className="status-message error">
                <i className="fas fa-exclamation-circle"></i>
                <span>{errorMessage}</span>
              </div>
            )}

            <form ref={formRef} onSubmit={(e) => handleSaveProject(e)} className="admin-form">
              {/* Project Details Section */}
              <div className="form-section">
                <h3 className="form-section-title">Project Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="projectName" className="form-label">Project Name</label>
                    <input
                      type="text"
                      id="projectName"
                      name="name"
                      className="form-input"
                      value={projectForm.name}
                      onChange={handleProjectFormChange}
                      placeholder="e.g., My Awesome App"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="projectStatus" className="form-label">Status</label>
                    <select
                      id="projectStatus"
                      name="status"
                      className="form-select"
                      value={projectForm.status}
                      onChange={handleProjectFormChange}
                    >
                      <option value="completed">Completed</option>
                      <option value="in-progress">In Progress</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="projectDescription" className="form-label">Description</label>
                  <textarea
                    id="projectDescription"
                    name="description"
                    className="form-textarea"
                    value={projectForm.description}
                    onChange={handleProjectFormChange}
                    rows={4}
                    placeholder="A brief overview of the project"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="projectType" className="form-label">Project Type</label>
                    <select
                      id="projectType"
                      name="type"
                      className="form-select"
                      value={projectForm.type}
                      onChange={handleProjectFormChange}
                    >
                      <option value="standard">Standard</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  {projectForm.type === 'video' && (
                    <div className="form-group">
                      <label htmlFor="projectVideoUrl" className="form-label">Video URL (YouTube)</label>
                      <input
                        type="url"
                        id="projectVideoUrl"
                        name="videoUrl"
                        className="form-input"
                        value={projectForm.videoUrl || ''}
                        onChange={handleProjectFormChange}
                        placeholder="https://www.youtube.com/watch?v=..."
                        required={projectForm.type === 'video'}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* URLs and Thumbnail Section */}
              <div className="form-section">
                <h3 className="form-section-title">Links & Media</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="projectThumbnail" className="form-label">Thumbnail URL</label>
                    <input
                      type="url"
                      id="projectThumbnail"
                      name="thumbnail"
                      className="form-input"
                      value={projectForm.thumbnail}
                      onChange={handleProjectFormChange}
                      placeholder="https://example.com/image.jpg"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="projectLink" className="form-label">Main Project Link</label>
                    <input
                      type="url"
                      id="projectLink"
                      name="link"
                      className="form-input"
                      value={projectForm.link}
                      onChange={handleProjectFormChange}
                      placeholder="https://github.com/user/project"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="projectCustomLink" className="form-label">Custom World URL Path</label>
                  <div className="input-with-prefix">
                    <span className="input-prefix">/project/</span>
                    <input
                      id="projectCustomLink"
                      name="customLink"
                      type="text"
                      className="form-input"
                      value={projectForm.customLink || ''}
                      onChange={handleProjectFormChange}
                      placeholder="my-cool-project-world"
                    />
                  </div>
                  <small className="input-help">Optional. Creates a path like yoursite.com/project/my-cool-project-world</small>
                </div>
              </div>

              {/* World Settings Section */}
              <div className="form-section">
                <h3 className="form-section-title">3D World Settings</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="worldBackgroundColor" className="form-label">Background Color</label>
                    <div className="color-picker">
                      <input
                        type="color"
                        id="worldBackgroundColor"
                        name="backgroundColor"
                        className="color-picker-input"
                        value={projectForm.worldSettings.backgroundColor}
                        onChange={handleWorldSettingsChange}
                      />
                      <span className="color-picker-value">{projectForm.worldSettings.backgroundColor}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="worldFloorColor" className="form-label">Floor Color</label>
                    <div className="color-picker">
                      <input
                        type="color"
                        id="worldFloorColor"
                        name="floorColor"
                        className="color-picker-input"
                        value={projectForm.worldSettings.floorColor}
                        onChange={handleWorldSettingsChange}
                      />
                      <span className="color-picker-value">{projectForm.worldSettings.floorColor}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="worldSkyColor" className="form-label">Sky Color</label>
                    <div className="color-picker">
                      <input
                        type="color"
                        id="worldSkyColor"
                        name="skyColor"
                        className="color-picker-input"
                        value={projectForm.worldSettings.skyColor}
                        onChange={handleWorldSettingsChange}
                      />
                      <span className="color-picker-value">{projectForm.worldSettings.skyColor}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="worldAmbientLightColor" className="form-label">Ambient Light Color</label>
                    <div className="color-picker">
                      <input
                        type="color"
                        id="worldAmbientLightColor"
                        name="ambientLightColor"
                        className="color-picker-input"
                        value={projectForm.worldSettings.ambientLightColor}
                        onChange={handleWorldSettingsChange}
                      />
                      <span className="color-picker-value">{projectForm.worldSettings.ambientLightColor}</span>
                    </div>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="worldAmbientLightIntensity" className="form-label">Ambient Light Intensity</label>
                    <input
                      type="range"
                      id="worldAmbientLightIntensity"
                      name="ambientLightIntensity"
                      className="form-range"
                      min="0" max="2" step="0.1"
                      value={projectForm.worldSettings.ambientLightIntensity}
                      onChange={handleWorldSettingsChange}
                    />
                    <span className="range-value">{projectForm.worldSettings.ambientLightIntensity}</span>
                  </div>
                  <div className="form-group">
                    <label htmlFor="worldDirectionalLightColor" className="form-label">Directional Light Color</label>
                    <div className="color-picker">
                      <input
                        type="color"
                        id="worldDirectionalLightColor"
                        name="directionalLightColor"
                        className="color-picker-input"
                        value={projectForm.worldSettings.directionalLightColor}
                        onChange={handleWorldSettingsChange}
                      />
                      <span className="color-picker-value">{projectForm.worldSettings.directionalLightColor}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="worldDirectionalLightIntensity" className="form-label">Directional Light Intensity</label>
                    <input
                      type="range"
                      id="worldDirectionalLightIntensity"
                      name="directionalLightIntensity"
                      className="form-range"
                      min="0" max="2" step="0.1"
                      value={projectForm.worldSettings.directionalLightIntensity}
                      onChange={handleWorldSettingsChange}
                    />
                    <span className="range-value">{projectForm.worldSettings.directionalLightIntensity}</span>
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="admin-button"
                  onClick={() => {
                    setIsEditingProject(false);
                    setSelectedProject(null);
                    setActiveSubTab('list');
                  }}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button type="submit" className="admin-button primary" disabled={isSaving}>
                  <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i> 
                  {isSaving ? (isEditingProject ? 'Saving...' : 'Creating...') : (isEditingProject ? 'Save Changes' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Media Upload Form */}
        {activeTab === 'projects' && activeSubTab === 'media' && selectedProject && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">Media Content</h2>
                <p className="admin-card-subtitle">
                  Add images, videos, and other media to your project
                </p>
              </div>
              <button 
                className="admin-button"
                onClick={() => setActiveSubTab('list')}
              >
                <i className="fas fa-arrow-left"></i> Back to Project
              </button>
            </div>
            
            <div id="media-edit-form-container" className="admin-form-container">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="media-title" className="form-label">Media Title</label>
                  <input
                    type="text"
                    id="media-title"
                    name="title"
                    className="form-input"
                    value={mediaFormData.title}
                    onChange={handleMediaFormChange}
                    placeholder="Enter media title"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="media-type" className="form-label">Media Type</label>
                  <select
                    id="media-type"
                    name="type"
                    className="form-select"
                    value={mediaFormData.type}
                    onChange={handleMediaFormChange}
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="media-description" className="form-label">Description</label>
                <textarea
                  id="media-description"
                  name="description"
                  className="form-textarea"
                  value={mediaFormData.description}
                  onChange={handleMediaFormChange}
                  placeholder="Describe this media item"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="media-url" className="form-label">Media URL</label>
                  <input
                    type="text"
                    id="media-url"
                    name="url"
                    className="form-input"
                    value={mediaFormData.url}
                    onChange={handleMediaFormChange}
                    placeholder="https://example.com/media.jpg"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Position in 3D Space</label>
                  <div className="position-control">
                    <div className="position-control-axis">
                      <label className="position-control-label">
                        <span className="position-control-label-x">X</span>
                      </label>
                      <input
                        type="number"
                        className="position-control-input"
                        value={mediaFormData.position[0]}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setMediaFormData({
                            ...mediaFormData,
                            position: [value, mediaFormData.position[1], mediaFormData.position[2]]
                          });
                        }}
                        step="0.1"
                      />
                    </div>
                    <div className="position-control-axis">
                      <label className="position-control-label">
                        <span className="position-control-label-y">Y</span>
                      </label>
                      <input
                        type="number"
                        className="position-control-input"
                        value={mediaFormData.position[1]}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setMediaFormData({
                            ...mediaFormData,
                            position: [mediaFormData.position[0], value, mediaFormData.position[2]]
                          });
                        }}
                        step="0.1"
                      />
                    </div>
                    <div className="position-control-axis">
                      <label className="position-control-label">
                        <span className="position-control-label-z">Z</span>
                      </label>
                      <input
                        type="number"
                        className="position-control-input"
                        value={mediaFormData.position[2]}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setMediaFormData({
                            ...mediaFormData,
                            position: [mediaFormData.position[0], mediaFormData.position[1], value]
                          });
                        }}
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Or Upload File</label>
                <div 
                  className={`file-upload-container ${fileUploadPreview ? 'has-file' : ''}`}
                  onClick={handleFileUploadClick}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept="image/*,video/*,application/pdf"
                  />
                  
                  {!fileUploadPreview ? (
                    <>
                      <div className="file-upload-icon">
                        <i className="fas fa-cloud-upload-alt"></i>
                      </div>
                      <p className="file-upload-text">
                        Click to upload or drag and drop
                      </p>
                      <small style={{ color: 'var(--admin-light-gray)', marginTop: '0.5rem' }}>
                        Supported formats: JPG, PNG, GIF, MP4, PDF
                      </small>
                    </>
                  ) : (
                    <div className="file-upload-preview">
                      {fileUploadPreview.type.includes('image') && (
                        <img src={fileUploadPreview.url} alt={fileUploadPreview.name} />
                      )}
                      {!fileUploadPreview.type.includes('image') && (
                        <div className="file-upload-icon" style={{ marginBottom: '0.5rem' }}>
                          <i className={`fas ${
                            fileUploadPreview.type.includes('video') ? 'fa-video' :
                            fileUploadPreview.type.includes('pdf') ? 'fa-file-pdf' :
                            'fa-file'
                          }`}></i>
                        </div>
                      )}
                      <div className="file-upload-preview-actions">
                        <button
                          type="button"
                          className="file-upload-preview-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearFileUpload();
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {fileUploadPreview && (
                  <div className="file-upload-info">
                    <span className="file-upload-info-name">{fileUploadPreview.name}</span>
                    <span className="file-upload-info-size">{formatFileSize(fileUploadPreview.size)}</span>
                  </div>
                )}
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  className="admin-button"
                  onClick={resetMediaForm}
                >
                  {editingMediaIndex !== null ? 'Cancel Edit' : 'Clear Form'}
                </button>
                <button
                  type="button"
                  className="admin-button"
                  onClick={forceRefreshWorldService}
                  title="Force refresh world data"
                >
                  <i className="fas fa-sync"></i> Force Refresh
                </button>
                <button
                  type="button"
                  className="admin-button primary"
                  onClick={handleAddProjectMedia}
                  disabled={!mediaFormData.title || (!mediaFormData.url && !fileUploadPreview)}
                >
                  <i className={editingMediaIndex !== null ? 'fas fa-save' : 'fas fa-plus'}></i>
                  <span>{editingMediaIndex !== null ? 'Update Media' : 'Add Media'}</span>
                </button>
              </div>
            </div>
            
            {/* Media Items Grid */}
            <div style={{ marginTop: '2rem' }}>
              <h3 className="admin-card-subtitle" style={{ marginBottom: '1rem' }}>Project Media</h3>
              
              {projectMedia.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'var(--admin-offwhite)', borderRadius: 'var(--admin-border-radius)' }}>
                  <i className="fas fa-photo-video" style={{ fontSize: '2rem', color: 'var(--admin-light-gray)', marginBottom: '1rem' }}></i>
                  <h4>No Media Added Yet</h4>
                  <p style={{ marginBottom: '1rem' }}>Add images, videos, or documents to enhance your project</p>
                  <button
                    type="button"
                    className="admin-button"
                    onClick={populateWithMockMedia}
                  >
                    <i className="fas fa-magic"></i> Add Sample Media
                  </button>
                </div>
              ) : (
                <div className="media-items-grid">
                  {projectMedia.map((media, index) => (
                    <div className="media-item" key={index}>
                      <div className="media-item-preview">
                        {media.type === 'image' ? (
                          <img src={media.url} alt={media.title} />
                        ) : (
                          <div className="media-item-preview-icon">
                            <i className={`fas ${
                              media.type === 'video' ? 'fa-video' :
                              media.type === 'pdf' ? 'fa-file-pdf' :
                              'fa-file'
                            }`}></i>
                          </div>
                        )}
                      </div>
                      <div className="media-item-content">
                        <h4 className="media-item-title">{media.title}</h4>
                        <p className="media-item-description">{media.description}</p>
                        <div className="media-item-meta">
                          <span className="media-item-type">
                            <i className={`fas ${
                              media.type === 'image' ? 'fa-image' :
                              media.type === 'video' ? 'fa-video' :
                              media.type === 'pdf' ? 'fa-file-pdf' :
                              'fa-file'
                            }`}></i>
                            {media.type.charAt(0).toUpperCase() + media.type.slice(1)}
                          </span>
                          <span className="media-item-position">
                            [{media.position.map(p => p.toFixed(1)).join(', ')}]
                          </span>
                        </div>
                        <div className="media-item-actions">
                          <button
                            type="button"
                            className="media-item-action edit"
                            onClick={() => handleEditMedia(index)}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            type="button"
                            className="media-item-action delete"
                            onClick={() => handleRemoveProjectMedia(index)}
                          >
                            <i className="fas fa-trash-alt"></i> Remove
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
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">Settings</h2>
                <p className="admin-card-subtitle">
                  Configure your 3D portfolio settings
                </p>
              </div>
            </div>
            
            <div className="admin-form-container">
              <h3 className="admin-card-subtitle" style={{ marginBottom: '1.5rem' }}>General Settings</h3>
              
              <div className="form-group">
                <label className="form-label">Default World Background Color</label>
                <div className="color-picker">
                  <input
                    type="color"
                    className="color-picker-input"
                    value="#000000"
                    onChange={() => {}}
                  />
                  <span className="color-picker-value">#000000</span>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Auto-save Projects</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="auto-save"
                    checked={true}
                    onChange={() => {}}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="auto-save" style={{ margin: 0, fontWeight: 'normal' }}>
                    Enable auto-saving of projects
                  </label>
                </div>
              </div>
              
              <h3 className="admin-card-subtitle" style={{ margin: '2rem 0 1.5rem' }}>Debug Tools</h3>
              
              <div className="form-row">
                <button 
                  className="admin-button"
                  onClick={inspectLocalStorage}
                >
                  <i className="fas fa-database"></i> Inspect Storage
                </button>
                
                <button 
                  className="admin-button"
                  onClick={exportLocalStorage}
                >
                  <i className="fas fa-file-export"></i> Export Data
                </button>
                
                <button 
                  className="admin-button warning"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                      resetAllData();
                    }
                  }}
                >
                  <i className="fas fa-trash-alt"></i> Reset All Data
                </button>
              </div>
              
              <div className="form-row" style={{ marginTop: '1rem' }}>
                <button 
                  className="admin-button"
                  onClick={cleanupDuplicateWorlds}
                >
                  <i className="fas fa-broom"></i> Cleanup Duplicates
                </button>
                
                <button 
                  className="admin-button"
                  onClick={() => fixWorldColors(selectedProject?.id || 0)}
                  disabled={!selectedProject}
                >
                  <i className="fas fa-palette"></i> Fix Colors
                </button>
                
                <button 
                  className="admin-button"
                  onClick={() => forceUpdateWorld(selectedProject?.id || 0)}
                  disabled={!selectedProject}
                >
                  <i className="fas fa-sync"></i> Force Update
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Debug Tab */}
        {activeTab === 'debug' && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 className="admin-card-title">Debug Tools</h2>
                <p className="admin-card-subtitle">
                  Advanced tools for debugging and development
                </p>
              </div>
            </div>
            
            <div className="admin-debug-tools">
              <div className="debug-tool-group">
                <h3>Data Management</h3>
                <div className="debug-tool-buttons">
                  <button 
                    className="admin-button"
                    onClick={inspectLocalStorage}
                  >
                    <i className="fas fa-search"></i> Inspect Storage
                  </button>
                  <button 
                    className="admin-button"
                    onClick={exportLocalStorage}
                  >
                    <i className="fas fa-file-export"></i> Export Data
                  </button>
                  <button 
                    className="admin-button danger"
                    onClick={resetAllData}
                  >
                    <i className="fas fa-trash-alt"></i> Reset All Data
                  </button>
                </div>
              </div>
              
              <div className="debug-tool-group">
                <h3>World Management</h3>
                <div className="debug-tool-buttons">
                  <button 
                    className="admin-button"
                    onClick={cleanupDuplicateWorlds}
                  >
                    <i className="fas fa-broom"></i> Clean Duplicates
                  </button>
                  <button 
                    className="admin-button"
                    onClick={() => fixWorldColors(selectedProject?.id || 0)}
                    disabled={!selectedProject}
                  >
                    <i className="fas fa-palette"></i> Fix Colors
                  </button>
                  <button 
                    className="admin-button"
                    onClick={() => forceUpdateWorld(selectedProject?.id || 0)}
                    disabled={!selectedProject}
                  >
                    <i className="fas fa-hammer"></i> Force Update
                  </button>
                  <button 
                    className="admin-button"
                    onClick={forceRefreshWorldService}
                  >
                    <i className="fas fa-sync"></i> Force Refresh
                  </button>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Select Project</label>
                  <select 
                    className="form-select"
                    value={selectedProject?.id || ''}
                    onChange={(e) => {
                      const projectId = parseInt(e.target.value);
                      const project = projects.find(p => p.id === projectId);
                      setSelectedProject(project || null);
                    }}
                  >
                    <option value="">-- Select a project --</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button 
                    className="admin-button"
                    onClick={() => inspectWorld(selectedProject?.id || 0)}
                    disabled={!selectedProject}
                  >
                    <i className="fas fa-eye"></i> Inspect World
                  </button>
                </div>
              </div>
              
              <div className="form-row">
                <button 
                  className="admin-button"
                  onClick={() => editRawEnvironment(selectedProject?.id || 0)}
                  disabled={!selectedProject}
                  type="button"
                >
                  <i className="fas fa-code"></i> Edit Raw Data
                </button>
                
                <button 
                  className="admin-button"
                  onClick={() => {
                    if (selectedProject) {
                      window.open(`/world/${getWorldId(selectedProject.id)}`, '_blank');
                    }
                  }}
                  disabled={!selectedProject}
                  type="button"
                >
                  <i className="fas fa-external-link-alt"></i> Open World
                </button>
                
                <button 
                  className="admin-button"
                  onClick={() => {
                    if (selectedProject) {
                      saveDebugData(selectedProject.id);
                    }
                  }}
                  disabled={!selectedProject}
                  type="button"
                >
                  <i className="fas fa-save"></i> Save Debug Data
                </button>
                
                <button 
                  className="admin-button"
                  onClick={forceRefreshWorldService}
                  type="button"
                >
                  <i className="fas fa-sync"></i> Force Refresh
                </button>
              </div>
              
              <h3 className="admin-card-subtitle" style={{ margin: '2rem 0 1.5rem' }}>System Information</h3>
              
              <div style={{ 
                backgroundColor: 'var(--admin-dark)', 
                color: 'var(--admin-white)', 
                padding: '1rem', 
                borderRadius: 'var(--admin-border-radius)', 
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                <div>Projects: {projects.length}</div>
                <div>Worlds: {worlds.length}</div>
                <div>Storage Size: {formatFileSize(JSON.stringify(localStorage).length)}</div>
                <div>Browser: {navigator.userAgent}</div>
              </div>
              
              <div className="form-actions" style={{ marginTop: '2rem' }}>
                <button 
                  className="admin-button primary"
                  onClick={() => {
                    // Copy debug info to clipboard
                    const debugInfo = {
                      projects: projects.length,
                      worlds: worlds.length,
                      storageSize: formatFileSize(JSON.stringify(localStorage).length),
                      browser: navigator.userAgent,
                      timestamp: new Date().toISOString()
                    };
                    
                    copyToClipboard(debugInfo);
                    setSuccessMessage('Debug info copied to clipboard');
                    setTimeout(() => setSuccessMessage(''), 3000);
                  }}
                >
                  <i className="fas fa-clipboard"></i> Copy Debug Info
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Debug Dialog */}
      {debugInfo.isVisible && renderDebugDialog()}
    </div>
  );
};

export default ModernAdminDashboard; 