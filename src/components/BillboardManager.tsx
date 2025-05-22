import { useThree, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

/**
 * Enhanced BillboardManager for perfect horizontal-only billboard effect
 * Uses a flat approach with direct matrix manipulation to eliminate all tilting
 * Maintains original object positions to prevent flying cards
 */
export default function BillboardManager() {
  const { camera, scene } = useThree()
  
  // Use a ref to track if pointer is locked
  const pointerLockedRef = useRef(false)
  
  // Create reusable objects to avoid garbage collection
  const camPos = useRef(new THREE.Vector3())
  const objPos = useRef(new THREE.Vector3())
  const tempMatrix = useRef(new THREE.Matrix4())
  const tempQuaternion = useRef(new THREE.Quaternion())
  const yAxis = useRef(new THREE.Vector3(0, 1, 0))
  
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
        // Skip if object doesn't use position from useFrame
        if (obj.userData.skipBillboardPositioning) return;
        
        // IMPORTANT: Only modify the rotation, not the position
        // We'll preserve the object's original position
        
        // Get object's world position
        obj.getWorldPosition(objPos.current)
        
        // Calculate horizontal direction to camera (zero out Y component)
        const dx = camPos.current.x - objPos.current.x
        const dz = camPos.current.z - objPos.current.z
        
        // Calculate rotation around Y axis only (yaw)
        const yRotation = Math.atan2(dx, dz)
        
        // Apply rotation directly to object without affecting position
        if (obj.matrixAutoUpdate) {
          // For objects using standard Three.js positioning
          obj.rotation.y = yRotation;
        } else {
          // For objects with custom matrix handling, more careful approach needed
          // Get the object's current scale
          const objScale = new THREE.Vector3();
          obj.getWorldScale(objScale);
          
          // Create rotation around Y axis only
          tempQuaternion.current.setFromAxisAngle(yAxis.current, yRotation);
          
          // Create a new matrix preserving original position and scale
          tempMatrix.current.compose(
            objPos.current,
            tempQuaternion.current,
            objScale
          );
          
          // Apply the matrix while preserving position
          obj.matrix.copy(tempMatrix.current);
          obj.matrixWorldNeedsUpdate = true;
        }
      }
    })
  })

  // This component doesn't render anything
  return null
} 