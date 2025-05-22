import { useThree, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

/**
 * Simple BillboardManager that only rotates objects to face the camera
 * Without changing their position or applying any matrix transforms
 */
export default function BillboardManager() {
  const { camera, scene } = useThree()
  
  // Use a ref to track if pointer is locked
  const pointerLockedRef = useRef(false)
  
  // Camera position vector (reused)
  const camPos = useRef(new THREE.Vector3())
  
  // Target types that should billboard
  const targetTypes = [
    'project', 'image', 'video', 'pdf', 'link', 'button'
  ]
  
  // Update on each frame
  useFrame(() => {
    // Only apply billboarding when pointer is locked (gameplay mode)
    pointerLockedRef.current = !!document.pointerLockElement
    
    if (!pointerLockedRef.current) return
    
    // Get camera world position once per frame
    camera.getWorldPosition(camPos.current)

    // Traverse the scene once to find all card/media objects
    scene.traverse((obj) => {
      // Skip non-visible objects or those with disabled billboarding
      if (!obj.visible || obj.userData?.disableBillboard) return
      
      // Check if this object should be billboarded
      if (obj.userData && (
          targetTypes.includes(obj.userData.objectType) || 
          (obj.name && (
            obj.name.toLowerCase().includes('card') || 
            obj.name.toLowerCase().includes('media')
          ))
        )) {
        
        // SIMPLE APPROACH: Just make the object look at the camera's XZ position
        // This preserves the object's original position entirely
        
        // Create a target position at the same height as the object
        const targetPosition = new THREE.Vector3(
          camPos.current.x,
          obj.position.y, // Keep same height
          camPos.current.z
        );
        
        // Make the object look at the camera (only horizontally)
        obj.lookAt(targetPosition);
      }
    })
  })

  // This component doesn't render anything
  return null
} 