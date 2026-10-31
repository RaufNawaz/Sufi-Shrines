@echo off
rem Starts the Shrines Stata service for the GIS viewer (pipeline/gis/viewer/stata_service/stata_service.py).
rem Listens on this computer only. Close this window, or press Ctrl+C, to stop it.
cd /d "%~dp0"
python -I stata_service.py
pause
