#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

def remove_cascade_path():
    # Force remove CascadeProjects from sys.path
    sys.path = [p for p in sys.path if 'CascadeProjects' not in str(p)]
    
    # Also remove from PYTHONPATH if it exists
    if 'PYTHONPATH' in os.environ:
        paths = os.environ['PYTHONPATH'].split(os.pathsep)
        paths = [p for p in paths if 'CascadeProjects' not in p]
        os.environ['PYTHONPATH'] = os.pathsep.join(paths)

def main():
    """Run administrative tasks."""
    # Get the absolute path to the project root
    project_root = Path(__file__).resolve().parent
    
    # Remove CascadeProjects path
    remove_cascade_path()
    
    # Add our project paths
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
