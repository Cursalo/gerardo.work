import { useThree, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

/**
 * BillboardManager that handles card rotations while maintaining their positions
 */
export default function BillboardManager() {
  const { camera, scene } = useThree()
  
  // Camera position vector (reused)
  const camPos = useRef(new THREE.Vector3())
  const targetPos = useRef(new THREE.Vector3())
  
  // Target types that should billboard
  const targetTypes = [
    'project', 'image', 'video', 'pdf', 'link', 'button'
  ]
  
  // Update on each frame
  useFrame(() => {
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
        
        // Store original position
        const originalY = obj.position.y
        
        // Calculate target position at same height as object
        targetPos.current.set(
          camPos.current.x,
          obj.position.y,
          camPos.current.z
        )
        
        // Make object look at camera position (only horizontally)
        obj.lookAt(targetPos.current)
        
        // Reset Y position to maintain original height
        obj.position.y = originalY
        
        // Lock rotation to only Y-axis
        obj.rotation.x = 0
        obj.rotation.z = 0
      }
    })
  })

  // This component doesn't render anything
  return null
} 