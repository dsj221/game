import {create} from 'zustand';
import type {TownState} from '../types/town';
import {initialTown} from '../data/town';
export const useTownStore=create<TownState>(initialTown);
