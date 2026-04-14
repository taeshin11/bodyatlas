import nibabel as nib
import numpy as np

img = nib.load('D:/ImageLabelAPI_SPINAI/outputs/brain_atlas_test/fastsurfer_out/sub01/mri/aparc.DKTatlas+aseg.deep.mgz')
data = np.asarray(img.dataobj).astype(np.int32)
labels = np.unique(data)
print(f'Shape: {data.shape}')
print(f'Unique labels: {len(labels)}')
print(f'Non-zero labels: {len(labels) - 1}')
print(f'Labels: {sorted(labels)}')
