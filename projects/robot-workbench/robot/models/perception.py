"""A transparent camera encoder baseline, replaceable by a learned visual tower."""
import math


class CentroidEncoder:
    def encode(self, camera):
        if len(camera) != 31 or any(len(row) != 3 for row in camera):
            raise ValueError('camera must be [31,3]')
        if any(not math.isfinite(v) or v < 0 for row in camera for v in row):
            raise ValueError('finite nonnegative intensities required')
        result = {}
        for channel, name in enumerate(('robot', 'red', 'blue')):
            mass = sum(row[channel] for row in camera)
            if mass <= 1e-8:
                raise ValueError('object is not visible: '+name)
            result[name] = sum((-2+4*i/30)*row[channel] for i, row in enumerate(camera))/mass
        return result
